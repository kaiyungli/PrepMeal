import { useMemo, useSyncExternalStore } from 'react';

export type OptionalSelections = Record<string, string[]>;
const memory = new Map<string, string>();
const eventName = 'prepmeal-optional-shopping-change';
const storageKey = (userId: string) => `optional-shopping-v1:${userId}`;

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key); else memory.clear();
    listener();
  };
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener('storage', onStorage);
  };
}

function read(userId: string | null | undefined) {
  if (!userId) return '{}';
  const key = storageKey(userId);
  if (memory.has(key)) return memory.get(key)!;
  try { return window.localStorage.getItem(key) || '{}'; }
  catch { return memory.get(key) || '{}'; }
}

export function useOptionalSelections(userId: string | null | undefined) {
  const raw = useSyncExternalStore(subscribe, () => read(userId), () => '{}');
  const selections = useMemo<OptionalSelections>(() => {
    try {
      const value = JSON.parse(raw);
      if (!value || Array.isArray(value) || typeof value !== 'object') return {};
      const valid: OptionalSelections = {};
      for (const [id, ids] of Object.entries(value)) {
        if (Array.isArray(ids) && ids.every(item => typeof item === 'string')) valid[id] = ids;
      }
      return valid;
    } catch { return {}; }
  }, [raw]);

  const select = (recipeId: string, ingredientIds: string[]) => {
    if (!userId) return;
    const next = JSON.stringify({ ...selections, [recipeId]: [...new Set(ingredientIds)].sort() });
    const key = storageKey(userId);
    try { window.localStorage.setItem(key, next); memory.delete(key); }
    catch { memory.set(key, next); }
    window.dispatchEvent(new Event(eventName));
  };
  return { selections, select };
}

// Stable ordering avoids cache misses caused only by object insertion order.
export function selectionKey(selections: OptionalSelections) {
  return JSON.stringify(Object.keys(selections).sort().map(id => [id, [...selections[id]].sort()]));
}

export function scopeSelections(selections: OptionalSelections, recipeIds: string[]): OptionalSelections {
  return Object.fromEntries([...new Set(recipeIds)].sort().filter(id => Object.hasOwn(selections, id)).map(id => [id, selections[id]]));
}
