/**
 * Recipe-detail prefetch — pure core.
 *
 * `RecipeDetailPrefetchRegistry` (in-flight bookkeeping) and
 * `resolveRecipeDetailSource` (the cache/join/fresh decision `useRecipeDetail`
 * relies on). Both receive every dependency — cache, fetch function — as a
 * constructor/call argument. This file imports NOTHING with a real runtime
 * value from elsewhere in the app: no `@/` alias, no relative import of
 * another local module, no Supabase, no singleton. That's deliberate, for two
 * independent reasons:
 *
 *   1. Testability: `recipeDetailPrefetch.test.ts` exercises this file
 *      directly against fake cache/fetch stand-ins, never the real ones — no
 *      network call is ever made and no test can affect another.
 *   2. Test-runner resolution: this repo's `npm test` runs on
 *      `node --test --experimental-strip-types`, which only strips TS syntax
 *      — it does none of tsc/Metro's extensionless relative-import
 *      resolution. A `.ts`-suffixed relative specifier resolves fine under
 *      that runner but requires `allowImportingTsExtensions` in
 *      `tsconfig.json` for `tsc` to accept it, which would apply to ALL
 *      production source, not just test-adjacent code. Keeping this file
 *      free of any relative import entirely sidesteps that: the test file
 *      loads THIS file via an explicit `.ts` extension (safe — nothing this
 *      file needs is resolved through it), while `recipeDetailPrefetch.ts`
 *      (the real app-wiring module, not test-loaded) can import from here
 *      with a normal, extensionless, tsc-default-friendly specifier.
 *
 * See `recipeDetailPrefetch.ts` for the singleton that wires this to the real
 * `recipeDetailCache` and the real (lazily-imported) `fetchRecipeDetail`.
 */
import type { RecipeDetail } from '@/types/recipe';

/** At most this many prefetch-initiated requests may be in flight at once. */
export const MAX_CONCURRENT_PREFETCHES = 2;

type FetchRecipeDetailFn = (idOrSlug: string) => Promise<RecipeDetail>;

/** Structural shape of the cache methods this module needs — matches
 *  `RecipeDetailCache` (`./recipeDetailCache`) without importing its class as
 *  a value (only ever referenced here as an inline structural type). */
interface PrefetchCacheReader {
  get(idOrSlug: string | null | undefined): RecipeDetail | undefined;
}
interface PrefetchCacheWriter {
  has(idOrSlug: string | null | undefined): boolean;
  set(idOrSlug: string | null | undefined, detail: RecipeDetail): void;
}

/** Normalise a slug/UUID lookup key so `Cucumber-Egg` and `cucumber-egg` hit
 *  the same in-flight entry. Intentionally duplicated from
 *  `recipeDetailCache.ts`'s identical one-liner rather than imported — see
 *  the file header on why this module takes zero relative imports. */
function normalizePrefetchKey(idOrSlug: string | null | undefined): string {
  return String(idOrSlug ?? '').trim().toLowerCase();
}

/**
 * Testable registry — instantiate with an isolated cache + fetch function for
 * unit tests. The module-level `recipeDetailPrefetch` singleton in
 * `recipeDetailPrefetch.ts` wires it to the real cache and the real
 * `fetchRecipeDetail` for app use.
 */
export class RecipeDetailPrefetchRegistry {
  private readonly inFlight = new Map<string, Promise<RecipeDetail>>();
  private readonly cache: PrefetchCacheWriter;
  private readonly fetchDetail: FetchRecipeDetailFn;
  private readonly maxConcurrent: number;

  constructor(
    cache: PrefetchCacheWriter,
    fetchDetail: FetchRecipeDetailFn,
    maxConcurrent: number = MAX_CONCURRENT_PREFETCHES,
  ) {
    this.cache = cache;
    this.fetchDetail = fetchDetail;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Existing in-flight promise for `idOrSlug`, if any — used to join a
   * request already running instead of starting a second one.
   */
  get(idOrSlug: string | null | undefined): Promise<RecipeDetail> | undefined {
    const key = normalizePrefetchKey(idOrSlug);
    return key === '' ? undefined : this.inFlight.get(key);
  }

  /** Number of requests currently in flight (for the concurrency bound / tests). */
  get size(): number {
    return this.inFlight.size;
  }

  /**
   * Start a recipe-detail fetch ahead of navigation. No-op if `idOrSlug` is
   * already cached, already in flight, or the concurrency bound is reached.
   */
  prefetch(idOrSlug: string | null | undefined): void {
    const key = normalizePrefetchKey(idOrSlug);
    // The `idOrSlug == null` check is redundant with `key === ''` in practice
    // (normalizePrefetchKey normalizes both to the same no-op), but gives
    // TypeScript an explicit narrowing point so `idOrSlug` below is `string`,
    // not `string | null | undefined` — `fetchDetail` needs the ORIGINAL
    // identifier (case preserved), not the lowercased `key`.
    if (key === '' || idOrSlug == null) return;
    if (this.cache.has(idOrSlug)) return;
    if (this.inFlight.has(key)) return;
    if (this.inFlight.size >= this.maxConcurrent) return;

    const promise = this.fetchDetail(idOrSlug)
      .then((detail) => {
        this.cache.set(idOrSlug, detail);
        return detail;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    // Mark as handled so a never-joined, ultimately-failed prefetch never
    // logs an unhandled-rejection warning. This attaches a SEPARATE reaction
    // to `promise` — it does not replace the stored reference, so a real
    // consumer that later calls `get()` and awaits it still observes the
    // original rejection untouched (e.g. a `RecipeNotFoundError` instance).
    promise.catch(() => {});

    this.inFlight.set(key, promise);
  }

  /** Test-only: drop all in-flight bookkeeping. Never touches the cache. */
  clear(): void {
    this.inFlight.clear();
  }
}

export type RecipeDetailSource =
  | { type: 'cache'; recipe: RecipeDetail }
  | { type: 'join'; promise: Promise<RecipeDetail> }
  | { type: 'fresh' };

/**
 * Decide where `useRecipeDetail` should get its data from. Pure — no I/O — so
 * it can be unit-tested independent of React/React Native.
 *
 * An explicit refetch (`bypassCache: true`) always resolves to `'fresh'`,
 * ignoring both the completed cache and any in-flight prefetch, so an
 * explicit retry is never served a possibly-already-failed shared request.
 */
export function resolveRecipeDetailSource(
  idOrSlug: string | null | undefined,
  bypassCache: boolean,
  cache: PrefetchCacheReader,
  registry: Pick<RecipeDetailPrefetchRegistry, 'get'>,
): RecipeDetailSource {
  if (!bypassCache) {
    const cached = cache.get(idOrSlug);
    if (cached) return { type: 'cache', recipe: cached };

    const shared = registry.get(idOrSlug);
    if (shared) return { type: 'join', promise: shared };
  }
  return { type: 'fresh' };
}
