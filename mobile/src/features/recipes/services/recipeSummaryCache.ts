/**
 * Session-memory summary cache — singleton wiring.
 *
 * Binds the pure `recipeSummaryCacheCore` state machine to the real
 * `fetchRecipes` network read and to `recipeDetailCache` alias invalidation.
 * This file has real `@/`-resolved value imports (via `fetchRecipes` /
 * `recipeDetailCache`), so — like `recipeDetailPrefetch.ts` — it is never
 * loaded by the `node --test` runner; the state machine it delegates to is
 * what's unit-tested (`recipeSummaryCacheCore.test.ts`).
 *
 * WHO CALLS WHAT:
 *   - `app/(tabs)/_layout.tsx` calls `preloadRecipeSummaries()` once on mount
 *     (fire-and-forget) to warm the slot before the user opens the 食譜 tab.
 *   - `useRecipes` reads `getCachedRecipeSummaries()` synchronously for its
 *     initial render, then calls `preloadRecipeSummaries()` for a background
 *     refresh (cache hit) or joins it as the blocking load (cache miss /
 *     explicit refetch, the latter with `{ force: true }`).
 *   - `useRecipes` Stage 2 reads `getCurrentSummaryGeneration()` to fence a
 *     full-detail warm against a newer accepted summary list.
 */
import type { RecipeSummary } from '@/types/recipe';

import { fetchRecipes } from './fetchRecipes';
import { recipeDetailCache } from './recipeDetailCache';
import { invalidateStaleRecipeDetailAliases } from '../lib/recipeDetailMapper';
import {
  createRecipeSummaryCache,
  RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS,
} from './recipeSummaryCacheCore';
import type {
  RecipeSummaryCacheEntry,
  RecipeSummaryPreloadOptions,
} from './recipeSummaryCacheCore';

const summaryCache = createRecipeSummaryCache({
  fetchSummaries: () => fetchRecipes(),
  onAccept: (recipes) => {
    // Only when a fresh summary result is actually accepted: drop any
    // detail-cache entry for every row in the new list (under slug AND UUID),
    // so a later background full-detail warm — or an on-demand open that lands
    // before it — can only produce a fresh entry, never a stale one.
    invalidateStaleRecipeDetailAliases(recipes, recipeDetailCache);
  },
});

/**
 * Warm / refresh the session summary slot. Returns a promise for a current
 * list. Joins an in-flight request when one exists (never a duplicate); serves
 * the slot without a network call when it was refreshed within
 * `RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS`, unless `{ force: true }`.
 */
export function preloadRecipeSummaries(
  options?: RecipeSummaryPreloadOptions,
): Promise<RecipeSummary[]> {
  return summaryCache.preload(options);
}

/** Synchronous read of the cached summary list; `undefined` until first load. */
export function getCachedRecipeSummaries(): RecipeSummaryCacheEntry | undefined {
  return summaryCache.get();
}

export function hasCachedRecipeSummaries(): boolean {
  return summaryCache.has();
}

/** Monotonic summary generation; +1 each time a fresh list is accepted. */
export function getCurrentSummaryGeneration(): number {
  return summaryCache.getGeneration();
}

/** Test / hot-reload reset. `generation` stays monotonic by design. */
export function clearRecipeSummaryCache(): void {
  summaryCache.clear();
}

export { RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS };
export type { RecipeSummaryCacheEntry } from './recipeSummaryCacheCore';
