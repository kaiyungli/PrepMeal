// Account-scoped, shared favorites state. Writes are serialized per recipe.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { timedFavoritesFetch } from '@/utils/favoritesTiming';
import { canStartSpeculativeFetch } from '@/utils/speculativeFetch';
import { beginFavoritesTrace, markFavoritesCache, markFavoritesTrace } from '@/features/performance/favoritesLoadTrace';

const EMPTY = Object.freeze({ favorites: [], recipes: [], loaded: false, loading: false, error: null, mutationError: null, pending: [] });
const entries = new Map();
const FRESH_MS = 30_000;
const IDLE_MS = 300_000;
function entryFor(key) {
  if (!entries.has(key)) entries.set(key, {
    key, loadedAt: 0, recipesLoadedAt: 0, idleTimer: null,
    snapshot: EMPTY, confirmed: [], recipes: [], recipesLoaded: false,
    listeners: new Set(), consumers: 0, generation: 0, revision: 0,
    writes: new Map(), load: null, token: null,
  });
  return entries.get(key);
}
export function invalidateFavoritesCache(userId) {
  for (const [key, entry] of entries) {
    if (userId && JSON.parse(key)[0] !== String(userId)) continue;
    reset(entry); entries.delete(key);
  }
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
  clearTimeout(entry.idleTimer); entry.idleTimer = null;
  lease.active = true;
  entry.consumers++;
  return () => {
    lease.active = false;
    if (--entry.consumers !== 0) return;
    // Uncertain writes must be reconciled by a fresh GET, never cached optimistically.
    if (entry.writes.size || !entry.snapshot.loaded || entry.snapshot.error || entry.snapshot.mutationError) reset(entry);
    else {
      entry.generation++;
      if (entry.load) { entry.load.active = false; entry.load.controller.abort(); }
      entry.load = null; entry.token = null;
      publish(entry, { loading: false });
    }
    entry.idleTimer = setTimeout(() => {
      if (entry.consumers === 0) {
        reset(entry);
        if (entries.get(entry.key) === entry) entries.delete(entry.key);
      }
    }, IDLE_MS);
  };
}
function needsLoad(entry, includeRecipes) {
  return !entry.snapshot.loaded || Date.now() - entry.loadedAt >= FRESH_MS ||
    (includeRecipes && (!entry.recipesLoaded || Date.now() - entry.recipesLoadedAt >= FRESH_MS));
}
function configure(entry, token, includeRecipes) {
  entry.token = token;
  const stale = needsLoad(entry, includeRecipes);
  markFavoritesCache(!stale, includeRecipes);
  if (stale) void load(entry, includeRecipes);
}
function reset(entry) {
  clearTimeout(entry.idleTimer); entry.idleTimer = null; entry.loadedAt = 0; entry.recipesLoadedAt = 0;
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
  const trace = beginFavoritesTrace('read', includeRecipes);
  publish(entry, { loading: true, error: null });
  request.promise = (async () => {
    try {
      const res = await timedFavoritesFetch(`/api/user/favorites${includeRecipes ? '?include=recipes' : ''}`, {
        headers: { Authorization: `Bearer ${entry.token}` }, signal: request.controller.signal,
      });
      markFavoritesTrace(trace, 'headers', res);
      if (!active()) return false;
      if (!res.ok) throw new Error('收藏載入失敗，請重試');
      const data = await res.json();
      markFavoritesTrace(trace, 'body');
      if (!active()) return false;
      if (!data?.success || !Array.isArray(data?.data?.favorites) ||
          (includeRecipes && (!Array.isArray(data?.data?.recipes) ||
            !data.data.recipes.every(recipe => recipe && typeof recipe === 'object' && recipe.id != null)))) throw new Error('收藏載入失敗，請重試');
      // A list begun before a write cannot overwrite the resulting state.
      if (entry.revision !== request.revision) { request.retry = true; return false; }
      entry.confirmed = data.data.favorites.map(String);
      if (includeRecipes) { entry.recipes = data.data.recipes; entry.recipesLoaded = true; entry.recipesLoadedAt = Date.now(); }
      else {
        const knownRecipes = new Set(entry.recipes.map(recipe => String(recipe.id)));
        if (entry.confirmed.some(id => !knownRecipes.has(id))) entry.recipesLoaded = false;
        // A verified empty ID list is already a complete empty recipe list.
        if (entry.confirmed.length === 0) {
          entry.recipes = []; entry.recipesLoaded = true; entry.recipesLoadedAt = Date.now();
        }
      }
      entry.loadedAt = Date.now();
      publish(entry, { loaded: true });
      markFavoritesTrace(trace, 'published');
      return true;
    } catch {
      if (active()) publish(entry, { error: '收藏載入失敗，請重試' });
      return false;
    } finally {
      markFavoritesTrace(trace, 'end');
      if (active()) {
        entry.load = null; publish(entry, { loading: false });
        if (request.retry) void load(entry, includeRecipes);
      }
    }
  })();
  return request.promise;
}

// Intent-only prefetch shares the normal account/epoch store and in-flight GET.
export async function prefetchFavorites(token, userId, sessionKey = 0) {
  if (!token || !userId) return false;
  const key = JSON.stringify([String(userId), sessionKey]);
  const cachedEntry = entries.get(key);
  const fresh = Boolean(cachedEntry && !needsLoad(cachedEntry, true));
  markFavoritesCache(fresh, true);
  if (fresh) return true;
  // Speculation must not abort a foreground ID-only read to upgrade its payload.
  // Genuine navigation can still request the full payload through configure().
  if (cachedEntry?.load && !cachedEntry.load.includeRecipes) return false;
  if (!canStartSpeculativeFetch()) return false;
  const entry = entryFor(key);
  const release = retain(entry, { active: false });
  entry.token = token;
  let timeout;
  try {
    if (!needsLoad(entry, true)) return true;
    // Retire speculative ownership after five seconds. A mounted page keeps
    // its own lease, so a slow genuine navigation request is not cancelled.
    return await Promise.race([load(entry, true), new Promise(resolve => {
      timeout = setTimeout(() => resolve(false), 5000);
    })]);
  } finally { clearTimeout(timeout); release(); }
}

function activatePrefetchLease(lease) {
  lease.active = true;
  return () => { lease.active = false; };
}

export function useFavoritesPrefetch(auth) {
  const enabled = !auth.loading && auth.isAuthenticated && Boolean(auth.user?.id);
  const scope = JSON.stringify([enabled, auth.user?.id, auth.favoritesEpoch || 0]);
  const lease = useMemo(() => ({ active: false, scope }), [scope]);
  useEffect(() => activatePrefetchLease(lease), [lease]);
  const { getAccessToken } = auth;
  const userId = auth.user?.id;
  const epoch = auth.favoritesEpoch || 0;
  return useCallback(async () => {
    if (!enabled || !lease.active || !canStartSpeculativeFetch()) return false;
    const trace = beginFavoritesTrace('intent_token');
    try {
      const token = await getAccessToken();
      markFavoritesTrace(trace, 'end');
      if (!token || !lease.active) return false;
      return await prefetchFavorites(token, userId, epoch);
    } catch { markFavoritesTrace(trace, 'end'); return false; }
  }, [enabled, lease, getAccessToken, userId, epoch]);
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
          const res = await timedFavoritesFetch(target ? '/api/user/favorites' : `/api/user/favorites?recipe_id=${encodeURIComponent(id)}`, {
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
          if (target) {
            entry.confirmed.push(id);
            if (!entry.recipes.some(recipe => String(recipe.id) === id)) entry.recipesLoaded = false;
          }
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

export function useFavorites(token, userId, { includeRecipes = false, sessionKey = 0 } = {}) {
  const entry = useMemo(() => userId ? entryFor(JSON.stringify([String(userId), sessionKey])) : null, [userId, sessionKey]);
  const enabled = Boolean(token && userId);
  const lease = useMemo(() => ({ entry, enabled, active: false }), [entry, enabled]);
  const subscribe = useCallback(listener => {
    if (!entry) return () => {};
    entry.listeners.add(listener);
    return () => entry.listeners.delete(listener);
  }, [entry]);
  const snapshot = useSyncExternalStore(subscribe, () => entry?.snapshot || EMPTY, () => EMPTY);
  const recipesReady = Boolean(entry?.recipesLoaded);
  useEffect(() => {
    if (!entry || !enabled) return;
    return retain(entry, lease);
  }, [entry, enabled, lease]);
  useEffect(() => {
    if (!entry || !enabled) return;
    configure(entry, token, includeRecipes);
  }, [entry, enabled, token, includeRecipes, recipesReady]);
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
  const hasLoaded = view.loaded && (!includeRecipes || Boolean(entry?.recipesLoaded));
  return { favorites: view.favorites, recipes,
    loading: enabled && !hasLoaded && !view.error, hasLoaded, refreshing: enabled && hasLoaded && view.loading, error: view.error,
    mutationError: view.mutationError, isFavorite, isPending, toggleFavorite, setFavorite: updateFavorite, retry };
}

// A late token resolution can only update the authentication scope that requested it.
export function useAccountFavorites(auth, { skipFavorites = false, includeRecipes = false } = {}) {
  const { getAccessToken } = auth;
  const enabled = !skipFavorites && !auth.loading && auth.isAuthenticated && Boolean(auth.user?.id);
  const scope = JSON.stringify([enabled, auth.user?.id, auth.favoritesEpoch || 0]);
  const previousAccount = useRef(auth.user?.id);
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isAuthenticated) invalidateFavoritesCache();
    else if (previousAccount.current && previousAccount.current !== auth.user?.id) invalidateFavoritesCache(previousAccount.current);
    previousAccount.current = auth.user?.id;
  }, [auth.loading, auth.isAuthenticated, auth.user?.id]);
  const [tokenAttempt, setTokenAttempt] = useState(0);
  const [resolved, setResolved] = useState({ scope: null, token: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const trace = beginFavoritesTrace('page_token');
    Promise.resolve().then(() => getAccessToken()).then(token => {
      markFavoritesTrace(trace, 'end');
      if (active) setResolved({ scope, token, error: token ? null : '無法取得登入資料，請重新登入' });
    }, () => { markFavoritesTrace(trace, 'end'); if (active) setResolved({ scope, token: null, error: '無法取得登入資料，請重新登入' }); });
    return () => { active = false; };
  }, [enabled, scope, getAccessToken, tokenAttempt]);
  const current = enabled && resolved.scope === scope;
  const favorites = useFavorites(current ? resolved.token : null, auth.user?.id, { includeRecipes, sessionKey: auth.favoritesEpoch || 0 });
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
