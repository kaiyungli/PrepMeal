/**
 * Generate candidate-pool session cache — pure core.
 *
 * Holds the ONE lean recipe list Generate runs the planner over (the bounded
 * `fetchGenerateRecipes` page — `GENERATE_RECIPE_LIMIT` rows), with a 5-minute
 * TTL and strict single-flight.
 *
 * WHY THIS EXISTS (the abort-race fix): the module-scoped in-flight request is
 * SHARED by every caller, so it must never be bound to any one component's
 * `AbortController`. An earlier version threaded the calling effect's
 * `AbortSignal` into the Supabase query; when that effect cleaned up (unmount,
 * or a retry bumping the reload index) it aborted the *shared* request, and the
 * retry that came right after would `join` that already-aborted promise and
 * surface a spurious error. Here the shared request has no signal at all: it
 * always runs to completion and populates the slot, and an obsolete caller is
 * dropped by the hook's own `cancelled` guard, not by cancelling the fetch.
 *
 * SINGLE-FLIGHT: at most one `load()` request is ever in flight. A concurrent
 * `fetch()` — `force` or not — joins that same promise rather than starting a
 * second. `force` only bypasses the freshness short-circuit; it can still only
 * ever join, never duplicate, an in-flight request.
 *
 * REQUEST RECENCY: each started request takes a sequence number; only the
 * newest may write the slot. A request still in flight when `clear()` runs is
 * superseded, so its late resolution can never resurrect a stale slot.
 *
 * Zero value imports (the `GenerateRecipe` import is type-only, erased by
 * `--experimental-strip-types`) so this loads under the repo's `node --test`
 * runner without a bundler or a live Supabase client — the same core/wiring
 * split `recipeSummaryCacheCore.ts` uses. The real Supabase query is wired in
 * by `fetchGenerateRecipes.ts`.
 */
import type { GenerateRecipe } from '../types.ts';

export const GENERATE_RECIPE_CACHE_TTL_MS = 5 * 60 * 1000;

export interface GenerateRecipesFetchOptions {
  /** Bypass the freshness check. Still joins an in-flight request, never a 2nd. */
  force?: boolean;
}

export interface CreateGenerateRecipesCacheDeps {
  /**
   * The network read (the Supabase query), or a fake in tests. Called with NO
   * arguments and NO abort signal: the shared request is deliberately not tied
   * to any screen's `AbortController` — a consumer unmounting or retrying must
   * not cancel it, so the slot still warms and a follow-up call can join it.
   */
  load: () => Promise<GenerateRecipe[]>;
  /** Clock; injectable for tests. Defaults to `Date.now`. */
  now?: () => number;
  /** Override the TTL (tests). */
  ttlMs?: number;
}

export interface GenerateRecipesCache {
  /**
   * Resolve with a current candidate pool:
   *   - a request already in flight        → that same promise (JOIN, no 2nd)
   *   - else a fresh slot and not `force`  → resolved immediately from the slot
   *   - else                               → a new single-flight `load()`
   * Rejections propagate to every joiner; the slot is left untouched on failure.
   */
  fetch(options?: GenerateRecipesFetchOptions): Promise<GenerateRecipe[]>;
  /** Synchronous read of the current slot; `null` until the first success. */
  peek(): GenerateRecipe[] | null;
  /** Drop the slot and in-flight handle (tests / hot reload). */
  clear(): void;
}

export function createGenerateRecipesCache(
  deps: CreateGenerateRecipesCacheDeps,
): GenerateRecipesCache {
  const now = deps.now ?? Date.now;
  const ttlMs = deps.ttlMs ?? GENERATE_RECIPE_CACHE_TTL_MS;

  let slot: { ts: number; recipes: GenerateRecipe[] } | null = null;
  let inFlight: Promise<GenerateRecipe[]> | null = null;
  let requestSeq = 0;

  function fetch(options?: GenerateRecipesFetchOptions): Promise<GenerateRecipe[]> {
    const force = options?.force === true;

    // (1) Join a request already in flight — forced or not. This is what keeps
    //     a retry from starting a duplicate, and (crucially) from joining a
    //     request some previous effect aborted: nothing here is ever aborted.
    if (inFlight) return inFlight;

    // (2) Fresh slot and caller didn't force → serve it, no network.
    if (!force && slot && now() - slot.ts < ttlMs) {
      return Promise.resolve(slot.recipes);
    }

    // (3) Start the one allowed request. It runs to completion regardless of
    //     who is still listening; only the newest request may write the slot.
    const mySeq = ++requestSeq;
    const request = deps.load().then((recipes) => {
      if (mySeq === requestSeq) {
        slot = { ts: now(), recipes };
      }
      return recipes;
    });

    const release = (): void => {
      if (inFlight === request) inFlight = null;
    };
    request.then(release, release);

    inFlight = request;
    return request;
  }

  function peek(): GenerateRecipe[] | null {
    return slot ? slot.recipes : null;
  }

  function clear(): void {
    slot = null;
    inFlight = null;
    // Supersede any request still in flight so its late resolution is dropped.
    requestSeq += 1;
  }

  return { fetch, peek, clear };
}
