/**
 * Recipe list controller hook.
 *
 * Owns loading / data / error state for the 食譜 tab and exposes `refetch`.
 * Built on plain React state + effect (no SWR / React Query — none is a mobile
 * dependency and this slice does not need caching).
 *
 * A single AbortController per run cancels the in-flight query on unmount or
 * refetch, so a StrictMode double-mount or a fast retry cannot leave a stale
 * response to overwrite fresh state.
 */
import { useCallback, useEffect, useState } from 'react';

import type { RecipeSummary } from '@/types/recipe';
import { MissingEnvError } from '@/lib/env';

import { fetchRecipes } from '../services/fetchRecipes';

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
  const [state, setState] = useState<InternalState>(INITIAL_STATE);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setState(INITIAL_STATE);

    fetchRecipes({ signal: controller.signal })
      .then((recipes) => {
        if (cancelled) return;
        setState({ status: 'success', recipes, error: null, isConfigError: false });
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
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
      controller.abort();
    };
  }, [reloadIndex]);

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
