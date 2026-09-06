/**
 * Recipe detail controller hook.
 *
 * Owns loading / data / not-found / error state for the detail route and
 * exposes `refetch`. Same stale-request discipline as `useRecipes`: one
 * `AbortController` per run cancels the in-flight RPC on unmount, identifier
 * change, or retry, so a fast back-and-forth cannot let a stale response
 * overwrite fresh state.
 *
 * `notFound` is a first-class state, distinct from `error` — the RPC returning
 * no row (unknown id/slug or a non-public recipe) is an expected outcome, not a
 * failure.
 *
 * SESSION CACHE: successful RPC payloads are stored in `recipeDetailCache` (a
 * small bounded in-memory LRU — no persistence, no React Query/SWR, no
 * provider). Re-opening a recipe already seen this session is served
 * synchronously from that cache and performs NO RPC. `refetch()` bypasses the
 * cache and overwrites the entry. If a fetch (including a forced refetch)
 * returns an authoritative `RecipeNotFoundError`, every cached alias for that
 * recipe is invalidated so the stale payload can never be served again.
 *
 * PREFETCH JOIN: `RecipeCard`'s `onPressIn` may already have started this
 * recipe's RPC before this screen even mounts (`recipeDetailPrefetch.ts`). If
 * so, this hook joins that SAME `Promise` instead of issuing a second RPC —
 * `resolveRecipeDetailSource` decides this. The joined request is never tied
 * to this hook's `AbortController` and is never aborted on unmount: a quick
 * back-navigation still lets it finish and populate `recipeDetailCache` for a
 * later open. An explicit `refetch()` always bypasses both the cache and any
 * in-flight prefetch — see `resolveRecipeDetailSource`.
 *
 * SEED: the caller may pass the `RecipeSummary` it already holds from the list.
 * It is exposed verbatim as `seed` so the screen can paint image/title/meta
 * immediately while the RPC fills in description/ingredients/steps. The seed is
 * kept conceptually separate from the authoritative `recipe` — it never
 * masquerades as a complete `RecipeDetail`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RecipeDetail, RecipeSummary } from '@/types/recipe';
import { MissingEnvError } from '@/lib/env';

import {
  fetchRecipeDetail,
  RecipeNotFoundError,
} from '../services/fetchRecipeDetail';
import { recipeDetailCache } from '../services/recipeDetailCache';
import {
  recipeDetailPrefetch,
  resolveRecipeDetailSource,
} from '../services/recipeDetailPrefetch';

export type RecipeDetailStatus = 'loading' | 'success' | 'notFound' | 'error';

export interface UseRecipeDetailOptions {
  /** Summary row from the list, used to paint a partial screen while loading. */
  seed?: RecipeSummary | null;
}

export interface UseRecipeDetailResult {
  status: RecipeDetailStatus;
  /** Authoritative detail. Non-null only once the RPC (or cache) has resolved. */
  recipe: RecipeDetail | null;
  /** Partial list-row data for the loading state; never an authoritative detail. */
  seed: RecipeSummary | null;
  /** `true` when `recipe` came from the session cache, not a fresh RPC. */
  fromCache: boolean;
  /** User-safe message, set only when `status === 'error'`. */
  error: string | null;
  /** `true` when the failure is missing Supabase configuration, not a query error. */
  isConfigError: boolean;
  /** Re-run the load, bypassing and refreshing the session cache. */
  refetch: () => void;
}

interface InternalState {
  status: RecipeDetailStatus;
  recipe: RecipeDetail | null;
  fromCache: boolean;
  error: string | null;
  isConfigError: boolean;
}

const CONFIG_ERROR_MESSAGE = '應用程式尚未完成設定，暫時無法載入食譜。';
const QUERY_ERROR_MESSAGE = '載入食譜時發生錯誤，請稍後再試。';

const LOADING_STATE: InternalState = {
  status: 'loading',
  recipe: null,
  fromCache: false,
  error: null,
  isConfigError: false,
};

const NOT_FOUND_STATE: InternalState = {
  status: 'notFound',
  recipe: null,
  fromCache: false,
  error: null,
  isConfigError: false,
};

/**
 * Shared rejection handling for BOTH the fresh-fetch path and the
 * prefetch-join path — an authoritative `RecipeNotFoundError` invalidates
 * every cached alias exactly as today; any other error surfaces the same
 * user-safe message. Not exported: this repo's `node --test` runner has no
 * `@/` path-alias resolution, and this hook (like `fetchRecipeDetail.ts`)
 * has a real `@/lib/env` import, so it cannot be imported by a unit test
 * regardless (see the note in `recipeDetailPrefetch.ts`). The registry-level
 * "a joined rejection is never swallowed" contract this depends on IS
 * unit-tested in `recipeDetailPrefetch.test.ts`; this function's own
 * behavior is unchanged from the pre-existing inline logic it replaces and
 * is exercised by both branches below identically.
 */
function applyRecipeDetailError(
  err: unknown,
  idOrSlug: string,
  setState: (state: InternalState) => void,
): void {
  if (err instanceof RecipeNotFoundError) {
    recipeDetailCache.invalidate(idOrSlug);
    setState(NOT_FOUND_STATE);
    return;
  }

  const isConfigError = err instanceof MissingEnvError;
  if (__DEV__) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn('[useRecipeDetail] load failed:', detail);
  }
  setState({
    status: 'error',
    recipe: null,
    fromCache: false,
    error: isConfigError ? CONFIG_ERROR_MESSAGE : QUERY_ERROR_MESSAGE,
    isConfigError,
  });
}

function initialStateFor(idOrSlug: string | undefined): InternalState {
  if (!idOrSlug) return NOT_FOUND_STATE;
  const cached = recipeDetailCache.get(idOrSlug);
  if (cached) {
    return { ...LOADING_STATE, status: 'success', recipe: cached, fromCache: true };
  }
  return LOADING_STATE;
}

export function useRecipeDetail(
  idOrSlug: string | undefined,
  { seed = null }: UseRecipeDetailOptions = {},
): UseRecipeDetailResult {
  const [state, setState] = useState<InternalState>(() => initialStateFor(idOrSlug));
  // `reloadIndex` increments only on an explicit refetch (retriggers the effect).
  const [reloadIndex, setReloadIndex] = useState(0);
  // The identifier a refetch was requested for — so "bypass cache" applies only
  // to that recipe, not to a later navigation to a different one.
  const forcedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!idOrSlug) {
      setState(NOT_FOUND_STATE);
      return;
    }

    const bypassCache = forcedKeyRef.current === idOrSlug;
    forcedKeyRef.current = null;

    // An explicit refetch always resolves to 'fresh' here, ignoring both the
    // completed cache and any in-flight prefetch (see the function's doc).
    const source = resolveRecipeDetailSource(
      idOrSlug,
      bypassCache,
      recipeDetailCache,
      recipeDetailPrefetch,
    );

    if (source.type === 'cache') {
      setState({
        status: 'success',
        recipe: source.recipe,
        fromCache: true,
        error: null,
        isConfigError: false,
      });
      return;
    }

    if (source.type === 'join') {
      // Joining a request `RecipeCard`'s `onPressIn` already started (or one
      // this hook itself started on an earlier render of the SAME id — either
      // way, exactly one RPC is in flight for this key). Deliberately NO
      // `AbortController` here: this request is not owned by this screen
      // instance, so unmounting (e.g. a quick back-navigation) must not abort
      // it — it keeps running and still writes to `recipeDetailCache` on
      // success. `cancelled` only stops a stale `setState` after unmount.
      let cancelled = false;

      setState(LOADING_STATE);

      source.promise
        .then((recipe) => {
          if (cancelled) return;
          setState({
            status: 'success',
            recipe,
            fromCache: false,
            error: null,
            isConfigError: false,
          });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          applyRecipeDetailError(err, idOrSlug, setState);
        });

      return () => {
        cancelled = true;
      };
    }

    // source.type === 'fresh' — no cache hit, no in-flight prefetch to join
    // (or an explicit refetch bypassing both). Unchanged from before this
    // slice: owns its own AbortController, aborts on unmount/id-change/reload.
    const controller = new AbortController();
    let cancelled = false;

    setState(LOADING_STATE);

    fetchRecipeDetail(idOrSlug, { signal: controller.signal })
      .then((recipe) => {
        if (cancelled) return;
        recipeDetailCache.set(idOrSlug, recipe);
        setState({
          status: 'success',
          recipe,
          fromCache: false,
          error: null,
          isConfigError: false,
        });
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        applyRecipeDetailError(err, idOrSlug, setState);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [idOrSlug, reloadIndex]);

  const refetch = useCallback(() => {
    forcedKeyRef.current = idOrSlug ?? null;
    setReloadIndex((n) => n + 1);
  }, [idOrSlug]);

  return {
    status: state.status,
    recipe: state.recipe,
    seed,
    fromCache: state.fromCache,
    error: state.error,
    isConfigError: state.isConfigError,
    refetch,
  };
}
