// Account-scoped, shared favorites state. Writes are serialized per recipe.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

const EMPTY = Object.freeze({ favorites: [], recipes: [], loaded: false, loading: false, error: null, mutationError: null, pending: [] });
const entries = new Map();
function entryFor(userId) {
  if (!entries.has(userId)) entries.set(userId, {
    snapshot: EMPTY, confirmed: [], recipes: [], recipesLoaded: false,
    listeners: new Set(), consumers: 0, generation: 0, revision: 0,
    writes: new Map(), load: null, token: null,
  });
  return entries.get(userId);
}
function publish(entry, patch = {}) {
  const favorites = new Set(entry.confirmed);
  for (const [id, write] of entry.writes) {
    if (write.desired) favorites.add(id); else favorites.delete(id);
  }
  const nextFavorites = [...favorites];
  const previousFavorites = entry.snapshot.favorites;
  // Pending/error changes do not invalidate unchanged recipe/filter results.
  const ids = nextFavorites.length === previousFavorites.length &&
    nextFavorites.every((id, index) => id === previousFavorites[index]) ? previousFavorites : nextFavorites;
  entry.snapshot = { ...entry.snapshot, ...patch, favorites: ids,
    recipes: entry.recipes, pending: [...entry.writes.keys()] };
  for (const listener of entry.listeners) listener();
}
function retain(entry, lease) {
  lease.active = true;
  entry.consumers++;
  return () => { lease.active = false; if (--entry.consumers === 0) reset(entry); };
}
function configure(entry, token, includeRecipes) {
  entry.token = token;
  if (!entry.snapshot.loaded || (includeRecipes && !entry.recipesLoaded)) void load(entry, includeRecipes);
}
function reset(entry) {
  entry.generation++;
  if (entry.load) { entry.load.active = false; entry.load.controller.abort(); }
  for (const write of entry.writes.values()) { write.active = false; write.controller?.abort(); }
  entry.load = null; entry.writes.clear(); entry.confirmed = []; entry.recipes = [];
  entry.recipesLoaded = false; entry.token = null; entry.snapshot = EMPTY;
  for (const listener of entry.listeners) listener();
}
async function load(entry, includeRecipes = false) {
  if (!entry.token || !entry.consumers) return false;
  if (entry.load) {
    if (!includeRecipes || entry.load.includeRecipes) return entry.load.promise;
    entry.load.active = false; entry.load.controller.abort();
  }
  const request = { active: true, controller: new AbortController(), includeRecipes,
    revision: entry.revision, generation: entry.generation, promise: null };
  entry.load = request;
  const active = () => request.active && entry.generation === request.generation && entry.consumers > 0;
  publish(entry, { loading: true, error: null });
  request.promise = (async () => {
    try {
      const res = await fetch(`/api/user/favorites${includeRecipes ? '?include=recipes' : ''}`, {
        headers: { Authorization: `Bearer ${entry.token}` }, signal: request.controller.signal,
      });
      if (!active()) return false;
      if (!res.ok) throw new Error('收藏載入失敗，請重試');
      const data = await res.json();
      if (!active()) return false;
      if (!data?.success || !Array.isArray(data?.data?.favorites) ||
          (includeRecipes && (!Array.isArray(data?.data?.recipes) ||
            !data.data.recipes.every(recipe => recipe && typeof recipe === 'object' && recipe.id != null)))) throw new Error('收藏載入失敗，請重試');
      // A list begun before a write cannot overwrite the resulting state.
      if (entry.revision !== request.revision) { request.retry = true; return false; }
      entry.confirmed = data.data.favorites.map(String);
      if (includeRecipes) { entry.recipes = data.data.recipes; entry.recipesLoaded = true; }
      publish(entry, { loaded: true });
      return true;
    } catch {
      if (active()) publish(entry, { error: '收藏載入失敗，請重試' });
      return false;
    } finally {
      if (active()) {
        entry.load = null; publish(entry, { loading: false });
        if (request.retry) void load(entry, includeRecipes);
      }
    }
  })();
  return request.promise;
}
function setFavorite(entry, recipeId, desired) {
  const id = recipeId == null ? '' : String(recipeId);
  if (!id || !entry?.token || !entry.consumers || !entry.snapshot.loaded) return Promise.resolve(false);
  const existing = entry.writes.get(id);
  if (existing) {
    existing.desired = desired;
    entry.revision++;
    publish(entry, { mutationError: null });
    return existing.promise;
  }
  if (entry.confirmed.includes(id) === desired) return Promise.resolve(true);
  const write = { desired, active: true, generation: entry.generation, controller: null, promise: null };
  entry.writes.set(id, write); entry.revision++;
  publish(entry, { mutationError: null });
  const active = () => write.active && write.generation === entry.generation && entry.consumers > 0;
  write.promise = (async () => {
    try {
      while (active()) {
        const target = write.desired;
        if (!entry.token) return false;
        write.controller = new AbortController();
        let success = false;
        try {
          const res = await fetch(target ? '/api/user/favorites' : `/api/user/favorites?recipe_id=${encodeURIComponent(id)}`, {
            method: target ? 'POST' : 'DELETE',
            headers: { Authorization: `Bearer ${entry.token}`, 'Content-Type': 'application/json' },
            ...(target ? { body: JSON.stringify({ recipe_id: id }) } : {}), signal: write.controller.signal,
          });
          if (!active()) return false;
          if (!target && res.status === 404) success = true;
          else if (res.ok) {
            const data = await res.json();
            if (!active()) return false;
            success = data?.success === true;
          }
        } catch { if (!active()) return false; }
        if (success) {
          entry.confirmed = entry.confirmed.filter(value => value !== id);
          if (target) entry.confirmed.push(id);
        }
        if (write.desired !== target) { publish(entry); continue; }
        if (!success) publish(entry, { mutationError: '收藏更新失敗，請重試' });
        return success;
      }
      return false;
    } finally {
      if (active()) {
        entry.writes.delete(id); entry.revision++;
        publish(entry);
      }
    }
  })();
  return write.promise;
}

export function useFavorites(token, userId, { includeRecipes = false } = {}) {
  const entry = useMemo(() => userId ? entryFor(String(userId)) : null, [userId]);
  const enabled = Boolean(token && userId);
  const lease = useMemo(() => ({ entry, enabled, active: false }), [entry, enabled]);
  const subscribe = useCallback(listener => {
    if (!entry) return () => {};
    entry.listeners.add(listener);
    return () => entry.listeners.delete(listener);
  }, [entry]);
  const snapshot = useSyncExternalStore(subscribe, () => entry?.snapshot || EMPTY, () => EMPTY);
  useEffect(() => {
    if (!entry || !enabled) return;
    return retain(entry, lease);
  }, [entry, enabled, lease]);
  useEffect(() => {
    if (!entry || !enabled) return;
    configure(entry, token, includeRecipes);
  }, [entry, enabled, token, includeRecipes]);
  const view = enabled ? snapshot : EMPTY;
  const favoriteSet = useMemo(() => new Set(view.favorites), [view.favorites]);
  const pendingSet = useMemo(() => new Set(view.pending), [view.pending]);
  const recipes = useMemo(() => view.recipes.filter(recipe => favoriteSet.has(String(recipe.id))), [view.recipes, favoriteSet]);
  const isFavorite = useCallback(id => favoriteSet.has(String(id)), [favoriteSet]);
  const isPending = useCallback(id => pendingSet.has(String(id)), [pendingSet]);
  const updateFavorite = useCallback((id, desired) => enabled && lease.active ? setFavorite(entry, id, desired) : Promise.resolve(false), [entry, enabled, lease]);
  const toggleFavorite = useCallback(id => {
    if (!enabled || !lease.active) return Promise.resolve(false);
    const desired = !(entry.writes.get(String(id))?.desired ?? entry.confirmed.includes(String(id)));
    return setFavorite(entry, id, desired);
  }, [entry, enabled, lease]);
  const retry = useCallback(() => enabled && lease.active ? load(entry, includeRecipes) : Promise.resolve(false), [entry, enabled, includeRecipes, lease]);
  return { favorites: view.favorites, recipes,
    loading: enabled && (!view.loaded && !view.error || view.loading), error: view.error,
    mutationError: view.mutationError, isFavorite, isPending, toggleFavorite, setFavorite: updateFavorite, retry };
}

// A late token resolution can only update the authentication scope that requested it.
export function useAccountFavorites(auth, { skipFavorites = false, includeRecipes = false } = {}) {
  const { getAccessToken } = auth;
  const enabled = !skipFavorites && !auth.loading && auth.isAuthenticated && Boolean(auth.user?.id);
  const scope = JSON.stringify([enabled, auth.user?.id]);
  const [tokenAttempt, setTokenAttempt] = useState(0);
  const [resolved, setResolved] = useState({ scope: null, token: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    Promise.resolve().then(() => getAccessToken()).then(token => {
      if (active) setResolved({ scope, token, error: token ? null : '無法取得登入資料，請重新登入' });
    }, () => { if (active) setResolved({ scope, token: null, error: '無法取得登入資料，請重新登入' }); });
    return () => { active = false; };
  }, [enabled, scope, getAccessToken, tokenAttempt]);
  const current = enabled && resolved.scope === scope;
  const favorites = useFavorites(current ? resolved.token : null, auth.user?.id, { includeRecipes });
  const { retry: retryFavorites } = favorites;
  const retry = useCallback(() => {
    if (!enabled) return Promise.resolve(false);
    if (current && resolved.token) return retryFavorites();
    setResolved({ scope: null, token: null, error: null });
    setTokenAttempt(value => value + 1);
    return Promise.resolve(false);
  }, [enabled, current, resolved.token, retryFavorites]);
  return { ...favorites, retry, loading: enabled && (!current || favorites.loading),
    error: current && resolved.error ? resolved.error : favorites.error };
}
