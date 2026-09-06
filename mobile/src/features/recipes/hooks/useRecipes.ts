/**
 * Recipe list controller hook.
 *
 * Owns loading / data / error state for the 食譜 tab and exposes `refetch`.
 * Built on plain React state + effect (no SWR / React Query — none is a mobile
 * dependency). The summary list itself IS cached now, but in a plain
 * module-scoped session cache (`recipeSummaryCache`), not in this hook.
 *
 * TWO-STAGE LOAD:
 *
 * Stage 1 — the summary list, via `recipeSummaryCache`:
 *   - The initial React state is seeded SYNCHRONOUSLY from
 *     `getCachedRecipeSummaries()`. When the tab-shell preload
 *     (`app/(tabs)/_layout.tsx`) has already warmed the slot, the very first
 *     render is `success` with the cached list — no `loading` frame, no
 *     network on the critical path.
 *   - Cache hit → a rate-limited background refresh via `preloadRecipeSummaries()`;
 *     it never drops back to `loading` and a refresh failure is swallowed (the
 *     cached list stays on screen).
 *   - Cache miss, or an explicit `refetch()` → the existing blocking load, but
 *     it JOINS the summary cache's single-flight request rather than starting
 *     its own `fetchRecipes()` — so the tab-shell preload and an early tab
 *     open share ONE request. `refetch()` passes `{ force: true }` for a real
 *     fresh request, still never a second concurrent one.
 *   - Stale `recipeDetailCache` aliases for the new list are invalidated in
 *     the cache's `onAccept` — exactly when a fresh summary result is
 *     accepted, and only then.
 *   - The summary request is deliberately NOT tied to an AbortController: a
 *     consumer unmounting must not cancel a shared preload/refresh. A
 *     per-effect `cancelled` flag guards `setState` instead; the request runs
 *     on to warm the slot for the next visit.
 *
 * Stage 2 (background, non-blocking) — a SEPARATE effect, gated on
 * `state.status === 'success'`, so it only starts once Stage 1's list has
 * actually committed (never chained inside Stage 1's own `.then()`). It
 * calls `fetchRecipeListWithDetail` (the full `get_recipe_list_with_detail_json`
 * RPC, already fully mapped by the time it resolves) and warms
 * `recipeDetailCache` with every row — but NEVER touches `status` / `recipes`
 * / `error`. The already-rendered summary list is never replaced, appended
 * to, or blocked by this. Stage 2 has its own AbortController/`cancelled`
 * flag, independent of Stage 1's; its cleanup runs before a newer Stage 2
 * attempt starts (unmount, or Stage 1 committing a fresh summary list after a
 * `refetch()`), so a slow/superseded background response can never overwrite
 * a newer one's cache entries (`warmRecipeDetailCacheIfCurrent` checks this
 * immediately before writing). A Stage 2 failure is swallowed (dev-only console.warn) —
 * it must never turn an already-successful, already-rendered list into an
 * error state. In addition to that `cancelled` guard, Stage 2 captures the
 * summary GENERATION it belongs to (`getCurrentSummaryGeneration()`) and
 * re-checks it right before the cache write: a full-detail batch derived from
 * a summary list that has since been superseded by a newer accepted result
 * must never write, even if this effect has not yet been torn down.
 *
 * Cache-miss / prefetch / single-detail fallback in `useRecipeDetail` is
 * unchanged by any of this: opening a recipe whose detail Stage 2 hasn't
 * warmed yet (or that Stage 2 failed to warm) falls through to the existing
 * prefetch-join-or-fresh-fetch path exactly as it did before.
 */
import { useCallback, useEffect, useState } from 'react';

import type { RecipeSummary } from '@/types/recipe';
import { MissingEnvError } from '@/lib/env';

import { fetchRecipeListWithDetail } from '../services/fetchRecipeListWithDetail';
import { warmRecipeDetailCacheIfCurrent } from '../lib/recipeDetailMapper';
import { recipeDetailCache } from '../services/recipeDetailCache';
import {
  preloadRecipeSummaries,
  getCachedRecipeSummaries,
  getCurrentSummaryGeneration,
} from '../services/recipeSummaryCache';

export type RecipesStatus = 'loading' | 'success' | 'error';

export interface UseRecipesResult {
  status: RecipesStatus;
  recipes: RecipeSummary[];
  /** User-safe message, set only when `status === 'error'`. */
  error: string | null;
  /** `true` when the failure is missing Supabase configuration, not a query error. */
  isConfigError: boolean;
  /** Re-run the load. Safe to call from an error-state retry button. */
  refetch: () => void;
}

interface InternalState {
  status: RecipesStatus;
  recipes: RecipeSummary[];
  error: string | null;
  isConfigError: boolean;
}

const CONFIG_ERROR_MESSAGE = '應用程式尚未完成設定，暫時無法載入食譜。';
const QUERY_ERROR_MESSAGE = '載入食譜時發生錯誤，請稍後再試。';

const INITIAL_STATE: InternalState = {
  status: 'loading',
  recipes: [],
  error: null,
  isConfigError: false,
};

export function useRecipes(): UseRecipesResult {
  // Seed synchronously from the session cache: a warm slot means the first
  // render is already `success` (no `loading` frame, no network on the path).
  const [state, setState] = useState<InternalState>(() => {
    const cached = getCachedRecipeSummaries();
    return cached
      ? {
          status: 'success',
          recipes: cached.recipes,
          error: null,
          isConfigError: false,
        }
      : INITIAL_STATE;
  });
  const [reloadIndex, setReloadIndex] = useState(0);

  // Stage 1: the summary list, via `recipeSummaryCache`.
  useEffect(() => {
    let cancelled = false;
    const isInitialLoad = reloadIndex === 0;
    const servedFromCache =
      isInitialLoad && getCachedRecipeSummaries() !== undefined;

    if (servedFromCache) {
      // Already showing the cached list. Background-refresh only: never fall
      // back to `loading`, never surface a refresh failure as an error.
      preloadRecipeSummaries()
        .then((recipes) => {
          if (cancelled) return;
          setState((prev) =>
            prev.status === 'success' && prev.recipes === recipes
              ? prev
              : { status: 'success', recipes, error: null, isConfigError: false },
          );
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (__DEV__) {
            const detail = err instanceof Error ? err.message : String(err);
            console.warn('[useRecipes] background summary refresh failed:', detail);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    // Cold cache, or an explicit refetch(): blocking load. Join the summary
    // cache's single-flight request — never start a duplicate `fetchRecipes()`.
    // An explicit refetch forces a fresh network request, but still joins any
    // request already in flight rather than adding a second concurrent one.
    setState(INITIAL_STATE);
    preloadRecipeSummaries({ force: !isInitialLoad })
      .then((recipes) => {
        if (cancelled) return;
        setState({ status: 'success', recipes, error: null, isConfigError: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const isConfigError = err instanceof MissingEnvError;
        if (__DEV__) {
          // Message only — never the error object (no key material in logs).
          const detail = err instanceof Error ? err.message : String(err);
          console.warn('[useRecipes] load failed:', detail);
        }
        setState({
          status: 'error',
          recipes: [],
          error: isConfigError ? CONFIG_ERROR_MESSAGE : QUERY_ERROR_MESSAGE,
          isConfigError,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  // Stage 2: background full-detail warm. A separate effect, gated on Stage
  // 1 having already committed a successful summary list — never started
  // from inside Stage 1's own `.then()`.
  useEffect(() => {
    if (state.status !== 'success') return;

    // The summary generation this warm belongs to. A newer accepted summary
    // (background refresh or an explicit refetch) increments it; a batch from
    // this (now older) generation must not write, even if this effect has not
    // been torn down yet.
    const warmGeneration = getCurrentSummaryGeneration();

    const controller = new AbortController();
    let cancelled = false;

    fetchRecipeListWithDetail({ signal: controller.signal })
      .then((rows) => {
        warmRecipeDetailCacheIfCurrent(
          rows,
          recipeDetailCache,
          () => !cancelled && getCurrentSummaryGeneration() === warmGeneration,
        );
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        if (__DEV__) {
          const detail = err instanceof Error ? err.message : String(err);
          console.warn('[useRecipes] background detail warm failed:', detail);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // Depend on `state.recipes` (the committed summary list identity), NOT
    // `reloadIndex`: a `refetch()` bumps `reloadIndex` synchronously while this
    // render still shows the PREVIOUS generation's `status === 'success'`, so
    // keying on `reloadIndex` here would restart the full-detail RPC against
    // stale data before Stage 1 has torn the list back down to `loading`.
    // Stage 1 always commits a fresh `recipes` array on success, so this still
    // re-runs once per completed reload.
  }, [state.status, state.recipes]);

  const refetch = useCallback(() => {
    setReloadIndex((n) => n + 1);
  }, []);

  return {
    status: state.status,
    recipes: state.recipes,
    error: state.error,
    isConfigError: state.isConfigError,
    refetch,
  };
}
