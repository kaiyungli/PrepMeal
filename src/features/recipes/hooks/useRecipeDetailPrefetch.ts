import { useEffect } from 'react';
import { prefetchRecipeDetail } from '../services/recipeDetailClientCache';

export function useRecipeDetailPrefetch(recipes: Array<{ id?: string | number }> | null | undefined) {
  const key = JSON.stringify((recipes || []).slice(0, 8).map(recipe => recipe?.id ?? null));
  useEffect(() => {
    const ids = JSON.parse(key) as Array<string | number | null>;
    if (!ids.some(id => id != null && id !== '')) return;
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      if (!active) return;
      ids.forEach((id, index) => {
        if (id == null || id === '') return;
        timers.push(setTimeout(() => {
          if (active) void prefetchRecipeDetail(String(id));
        }, index * 250));
      });
    };
    const usesIdle = typeof window.requestIdleCallback === 'function';
    const idleId = usesIdle ? window.requestIdleCallback(run, { timeout: 2000 }) : null;
    const initialTimer = usesIdle ? null : setTimeout(run, 1000);
    return () => {
      // Retire callbacks even if an idle callback has already been queued or
      // the browser does not provide cancelIdleCallback. Keep issued shared
      // detail reads alive: a foreground modal may already be using them.
      active = false;
      if (idleId !== null) window.cancelIdleCallback?.(idleId);
      if (initialTimer !== null) clearTimeout(initialTimer);
      timers.forEach(clearTimeout);
    };
  }, [key]);
}
