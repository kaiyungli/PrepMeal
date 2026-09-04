/**
 * Recipe detail controller hook.
 *
 * Owns loading / data / not-found / error state for the detail route and
 * exposes `refetch`. Same shape and stale-request discipline as `useRecipes`:
 * one `AbortController` per run cancels the in-flight RPC on unmount, identifier
 * change, or retry, so a fast back-and-forth cannot let a stale response
 * overwrite fresh state.
 *
 * `notFound` is a first-class state, distinct from `error` — the RPC returning
 * no row (unknown id/slug or a non-public recipe) is an expected outcome, not a
 * failure.
 *
 * No global state, no SWR / React Query.
 */
import { useCallback, useEffect, useState } from 'react';

import type { RecipeDetail } from '@/types/recipe';
import { MissingEnvError } from '@/lib/env';

import {
  fetchRecipeDetail,
  RecipeNotFoundError,
} from '../services/fetchRecipeDetail';

export type RecipeDetailStatus = 'loading' | 'success' | 'notFound' | 'error';

export interface UseRecipeDetailResult {
  status: RecipeDetailStatus;
  recipe: RecipeDetail | null;
  /** User-safe message, set only when `status === 'error'`. */
  error: string | null;
  /** `true` when the failure is missing Supabase configuration, not a query error. */
  isConfigError: boolean;
  /** Re-run the load. Safe to call from an error-state retry button. */
  refetch: () => void;
}

interface InternalState {
  status: RecipeDetailStatus;
  recipe: RecipeDetail | null;
  error: string | null;
  isConfigError: boolean;
}

const CONFIG_ERROR_MESSAGE = '應用程式尚未完成設定，暫時無法載入食譜。';
const QUERY_ERROR_MESSAGE = '載入食譜時發生錯誤，請稍後再試。';

const INITIAL_STATE: InternalState = {
  status: 'loading',
  recipe: null,
  error: null,
  isConfigError: false,
};

const NOT_FOUND_STATE: InternalState = {
  status: 'notFound',
  recipe: null,
  error: null,
  isConfigError: false,
};

export function useRecipeDetail(
  idOrSlug: string | undefined,
): UseRecipeDetailResult {
  const [state, setState] = useState<InternalState>(INITIAL_STATE);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    if (!idOrSlug) {
      setState(NOT_FOUND_STATE);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setState(INITIAL_STATE);

    fetchRecipeDetail(idOrSlug, { signal: controller.signal })
      .then((recipe) => {
        if (cancelled) return;
        setState({
          status: 'success',
          recipe,
          error: null,
          isConfigError: false,
        });
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;

        if (err instanceof RecipeNotFoundError) {
          setState(NOT_FOUND_STATE);
          return;
        }

        const isConfigError = err instanceof MissingEnvError;
        if (__DEV__) {
          // Message only — never the error object (no key material in logs).
          const detail = err instanceof Error ? err.message : String(err);
          console.warn('[useRecipeDetail] load failed:', detail);
        }
        setState({
          status: 'error',
          recipe: null,
          error: isConfigError ? CONFIG_ERROR_MESSAGE : QUERY_ERROR_MESSAGE,
          isConfigError,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [idOrSlug, reloadIndex]);

  const refetch = useCallback(() => {
    setReloadIndex((n) => n + 1);
  }, []);

  return {
    status: state.status,
    recipe: state.recipe,
    error: state.error,
    isConfigError: state.isConfigError,
    refetch,
  };
}
