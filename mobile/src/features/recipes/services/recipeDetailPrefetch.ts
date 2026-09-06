/**
 * Recipe-detail prefetch — app wiring.
 *
 * Started from `RecipeCard`'s press-intent gate (armed on `onPressIn`, before
 * the press completes and before `router.push` fires — see
 * `../lib/pressIntentGate.ts`), so the `get_recipe_detail_json` RPC gets a
 * head start that can overlap the native screen-push transition (~250-300ms)
 * instead of only starting once the detail screen has mounted.
 *
 * This module owns ONLY the real singleton wiring — `RecipeDetailPrefetchRegistry`
 * and `resolveRecipeDetailSource` themselves (the pure, fully-tested surface)
 * live in `recipeDetailPrefetchCore.ts` and are re-exported here unchanged.
 * See that file's header for why the split exists: this file uses normal,
 * extensionless relative imports (real `@/` app infrastructure included) and
 * is never loaded directly by `node --test`; the core file takes zero
 * relative imports so it CAN be loaded directly by the test runner.
 *
 * CONTRACT (implemented in `recipeDetailPrefetchCore.ts` — repeated here for
 * anyone reading only this file):
 *   - `prefetch(idOrSlug)` is a no-op if the recipe is already cached, already
 *     in flight, or the concurrency bound is reached — every no-op case falls
 *     back to `useRecipeDetail`'s existing mount-time fetch, so this can never
 *     make an open slower or more failure-prone than before this slice.
 *   - A prefetch's underlying request is NEVER tied to a per-screen
 *     `AbortController` and is NEVER cancelled by a consumer unmounting — a
 *     canceled press, a scroll-away, or a quick back-navigation all let it
 *     finish and populate `recipeDetailCache` for a later open.
 *   - A failed prefetch writes nothing to `recipeDetailCache` and leaves no
 *     trace in the registry once settled, so the very next attempt for the
 *     same id starts a completely fresh request — no sticky error cache.
 *   - The stored `Promise<RecipeDetail>` is never converted into a swallowed
 *     / fulfilled-with-null promise on error — a real consumer that joins it
 *     (via `get()`) observes the original rejection exactly as
 *     `useRecipeDetail`'s own fresh-fetch path does today.
 *
 * TEST-RUNNER NOTE: `fetchRecipeDetail` (real network access) is imported
 * LAZILY, on first actual use, not at module-evaluation time — see
 * `fetchRecipeDetailLazy` below. `fetchRecipeDetail.ts` has a real (non-type)
 * `@/lib/supabase` import; this repo's `node --test` runner has no `@/`
 * path-alias resolution (only `tsconfig.json`'s `paths`, which Metro/`tsc`
 * honor, not plain Node). This module itself is never loaded by a test (only
 * `recipeDetailPrefetchCore.ts` is), so that alone would already keep tests
 * safe — the dynamic `import()` here exists for the OTHER reason noted in
 * `fetchRecipeDetailLazy`'s comment: keeping the real network dependency out
 * of the module graph until an actual prefetch runs.
 */
import { recipeDetailCache } from './recipeDetailCache';
import {
  RecipeDetailPrefetchRegistry,
  resolveRecipeDetailSource,
  MAX_CONCURRENT_PREFETCHES,
  type RecipeDetailSource,
} from './recipeDetailPrefetchCore';
import type { RecipeDetail } from '@/types/recipe';

export {
  RecipeDetailPrefetchRegistry,
  resolveRecipeDetailSource,
  MAX_CONCURRENT_PREFETCHES,
  type RecipeDetailSource,
};

type FetchRecipeDetailFn = (idOrSlug: string) => Promise<RecipeDetail>;

// Resolved lazily, once, on the first real prefetch — never during a unit
// test (which only exercises `recipeDetailPrefetchCore.ts` directly with an
// injected fetch function and never calls this).
let realFetchRecipeDetail: FetchRecipeDetailFn | null = null;
async function fetchRecipeDetailLazy(idOrSlug: string): Promise<RecipeDetail> {
  if (!realFetchRecipeDetail) {
    ({ fetchRecipeDetail: realFetchRecipeDetail } = await import('./fetchRecipeDetail'));
  }
  return realFetchRecipeDetail(idOrSlug);
}

/** Process-wide singleton used by `RecipeListScreen` and `useRecipeDetail`. */
export const recipeDetailPrefetch = new RecipeDetailPrefetchRegistry(
  recipeDetailCache,
  fetchRecipeDetailLazy,
);

/** Called from `RecipeCard`'s press-intent gate (via `RecipeListScreen`). */
export function prefetchRecipeDetail(idOrSlug: string | null | undefined): void {
  recipeDetailPrefetch.prefetch(idOrSlug);
}

/** Used by `useRecipeDetail` (via `resolveRecipeDetailSource`) to join an already-running prefetch, if any. */
export function getInFlightRecipeDetail(
  idOrSlug: string | null | undefined,
): Promise<RecipeDetail> | undefined {
  return recipeDetailPrefetch.get(idOrSlug);
}
