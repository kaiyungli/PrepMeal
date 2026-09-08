/**
 * Generate candidate-pool controller.
 *
 * Plain React state + effect (no SWR / React Query — not a mobile dependency).
 * Stale-request discipline is a per-effect `cancelled` flag: an unmount / retry
 * marks its results obsolete so they can never overwrite fresh state. It does
 * NOT abort the fetch — that request is module-scoped and shared (5-min cache +
 * single-flight in `fetchGenerateRecipes`), so aborting it on cleanup would
 * cancel it for everyone and make the very next retry join a dead request.
 * Letting it finish just warms the cache for the retry to reuse.
 *
 * Single stage only — Generate wants the flat pool once, then runs a pure
 * function. No detail-warm pipeline.
 */
import { useCallback, useEffect, useState } from 'react';

import { MissingEnvError } from '@/lib/env';

import type { GenerateRecipe } from '../types.ts';
import { fetchGenerateRecipes } from '../services/fetchGenerateRecipes.ts';

export type GenerateRecipesStatus = 'loading' | 'success' | 'error';

export interface UseGenerateRecipesResult {
  status: GenerateRecipesStatus;
  recipes: GenerateRecipe[];
  /** User-safe message, set only when `status === 'error'`. */
  error: string | null;
  /** `true` when the failure is missing Supabase configuration. */
  isConfigError: boolean;
  refetch: () => void;
}

interface InternalState {
  status: GenerateRecipesStatus;
  recipes: GenerateRecipe[];
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

export function useGenerateRecipes(): UseGenerateRecipesResult {
  const [state, setState] = useState<InternalState>(INITIAL_STATE);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const force = reloadIndex > 0;

    setState((prev) => (prev.status === 'loading' && prev.recipes.length === 0 ? prev : INITIAL_STATE));

    fetchGenerateRecipes({ force })
      .then((recipes) => {
        if (cancelled) return;
        setState({ status: 'success', recipes, error: null, isConfigError: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const isConfigError = err instanceof MissingEnvError;
        if (__DEV__) {
          const detail = err instanceof Error ? err.message : String(err);
          console.warn('[useGenerateRecipes] load failed:', detail);
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
