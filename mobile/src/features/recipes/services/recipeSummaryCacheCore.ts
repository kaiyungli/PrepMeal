/**
 * Session-memory summary cache — pure core.
 *
 * Holds the ONE recipe-summary list the 食譜 tab renders (the bounded
 * `fetchRecipes` first page — `RECIPE_LIST_FIRST_PAGE_CEILING` rows, currently
 * 200), so opening that tab can render from memory instead of waiting on the
 * network. Freshness is kept by a background refresh, rate-limited to at most
 * one network request per `RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS`.
 *
 * Not an LRU map: there is a single, parameterless summary query, so there is a
 * single slot. "Bounded" is inherited from the bounded `fetchRecipes` page.
 *
 * SINGLE-FLIGHT: at most one `fetchSummaries()` request is ever in flight. A
 * `preload()` call while one is running returns that SAME promise — forced or
 * not — so the tab-shell preload and an early 食譜-tab cache miss share exactly
 * one request, and an explicit refetch never spawns a duplicate.
 *
 * GENERATION: a monotonic counter, incremented once per ACCEPTED fresh result
 * and never decremented (not even by `clear()`). Stage-2 full-detail warming
 * captures the generation it belongs to and re-checks it right before writing,
 * so a detail batch derived from a superseded summary list can never land.
 *
 * REQUEST RECENCY: each started request takes a sequence number; only the
 * newest may write the slot. A slow, superseded response (or one still in
 * flight when `clear()` runs) is dropped.
 *
 * Zero value imports (only a type-only `@/types/recipe` import, erased by
 * `--experimental-strip-types`) so this module loads under the repo's
 * `node --test` runner without a bundler or a live Supabase client — the same
 * core/wiring split `recipeDetailPrefetchCore.ts` uses. The real
 * `fetchRecipes` singleton and the detail-alias invalidation are wired in by
 * `recipeSummaryCache.ts`.
 */
import type { RecipeSummary } from '@/types/recipe';

/** Minimum spacing between summary network requests. A cache hit inside this
 *  window serves the slot with no refresh; an explicit `force` still fires. */
export const RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS = 30_000;

export interface RecipeSummaryCacheEntry {
  /** The accepted list. Replaced wholesale on each accept, never mutated. */
  readonly recipes: RecipeSummary[];
  /** `now()` at which this entry was accepted. */
  readonly storedAt: number;
}

export interface RecipeSummaryPreloadOptions {
  /**
   * Bypass the refresh-interval short-circuit and perform a real network
   * request. IGNORED when a request is already in flight — that request is
   * joined instead, never a second concurrent one.
   */
  force?: boolean;
}

export interface CreateRecipeSummaryCacheDeps {
  /**
   * The network read (`fetchRecipes`), or a fake in tests. Called with no
   * arguments: a preload / background refresh is deliberately NOT tied to any
   * screen's `AbortController` — a consumer unmounting must not cancel it, so
   * the slot still warms for the next visit.
   */
  fetchSummaries: () => Promise<RecipeSummary[]>;
  /**
   * Called synchronously the instant a fresh result is accepted — AFTER
   * `generation` is incremented and the slot replaced, BEFORE the `preload()`
   * promise resolves. The wiring layer uses it to invalidate stale
   * recipe-detail aliases exactly when (and only when) a fresh summary list is
   * accepted.
   */
  onAccept?: (recipes: RecipeSummary[], generation: number) => void;
  /** Clock; injectable for tests. Defaults to `Date.now`. */
  now?: () => number;
  /** Override the refresh interval (tests). */
  refreshMinIntervalMs?: number;
}

export interface RecipeSummaryCache {
  /** Synchronous read of the current slot; `undefined` until the first accept. */
  get(): RecipeSummaryCacheEntry | undefined;
  has(): boolean;
  /** Monotonic, process-lifetime; +1 per accepted fresh result. */
  getGeneration(): number;
  /**
   * Resolve with a current summary list:
   *   - a request already in flight  → that same promise (JOIN, no 2nd fetch)
   *   - else slot present, within the refresh interval, and not `force`
   *                                  → resolved immediately from the slot
   *   - else                         → a new single-flight `fetchSummaries()`
   * Rejections propagate to every joiner; the slot and generation are left
   * untouched on failure.
   */
  preload(options?: RecipeSummaryPreloadOptions): Promise<RecipeSummary[]>;
  /** Drop the slot and in-flight handle (tests / hot reload). `generation`
   *  stays monotonic so an in-flight warm that captured an older generation
   *  still can never write. */
  clear(): void;
}

export function createRecipeSummaryCache(
  deps: CreateRecipeSummaryCacheDeps,
): RecipeSummaryCache {
  const now = deps.now ?? Date.now;
  const refreshMinIntervalMs =
    deps.refreshMinIntervalMs ?? RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS;

  let slot: RecipeSummaryCacheEntry | undefined;
  let generation = 0;
  let requestSeq = 0;
  let inFlight: Promise<RecipeSummary[]> | null = null;
  /** `now()` at which the most recent network request STARTED. */
  let lastRequestStartedAt = Number.NEGATIVE_INFINITY;

  function get(): RecipeSummaryCacheEntry | undefined {
    return slot;
  }

  function has(): boolean {
    return slot !== undefined;
  }

  function getGeneration(): number {
    return generation;
  }

  function startRequest(): Promise<RecipeSummary[]> {
    const mySeq = ++requestSeq;
    lastRequestStartedAt = now();

    const request = deps.fetchSummaries().then((recipes) => {
      // Accept only if no newer request — and no clear() — has superseded this.
      if (mySeq === requestSeq) {
        generation += 1;
        slot = { recipes, storedAt: now() };
        deps.onAccept?.(recipes, generation);
      }
      return recipes;
    });

    // Release the single-flight handle once settled, WITHOUT swallowing the
    // outcome that joiners observe.
    const release = (): void => {
      if (inFlight === request) inFlight = null;
    };
    request.then(release, release);

    inFlight = request;
    return request;
  }

  function preload(
    options?: RecipeSummaryPreloadOptions,
  ): Promise<RecipeSummary[]> {
    const force = options?.force === true;

    // (1) Join a request already in flight — forced or not. This is what makes
    //     the tab-shell preload and an early 食譜-tab miss share ONE request,
    //     and stops an explicit refetch from starting a duplicate.
    if (inFlight) return inFlight;

    // (2) Slot present and refreshed within the interval, caller didn't force
    //     → serve it, no network.
    if (
      !force &&
      slot !== undefined &&
      now() - lastRequestStartedAt < refreshMinIntervalMs
    ) {
      return Promise.resolve(slot.recipes);
    }

    // (3) Start the one allowed request.
    return startRequest();
  }

  function clear(): void {
    slot = undefined;
    inFlight = null;
    lastRequestStartedAt = Number.NEGATIVE_INFINITY;
    // Supersede any request still in flight so its late accept is dropped.
    requestSeq += 1;
    // `generation` is intentionally NOT reset — see the interface doc.
  }

  return { get, has, getGeneration, preload, clear };
}
