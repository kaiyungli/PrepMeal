/**
 * "My plans" list controller hook.
 *
 * Plain React state + effect (no SWR / React Query — not a mobile dependency),
 * same stale-request discipline as `useRecipes`: one `AbortController` per run,
 * plus a per-effect `cancelled` flag, so an unmount / sign-out / retry can
 * never let a stale response overwrite fresh state.
 *
 * AUTH SCOPING via `authScope` (the stable signed-in `user.id`, or `null` when
 * restoring / signed out — see `../lib/authScope`):
 *   - `authScope === null` → status `'idle'`, NO query is fired, any previous
 *     result is cleared. Covers "auth still restoring" and "signed out", plus a
 *     sign-out mid-flight (the effect re-runs, aborts the request, resets).
 *   - `authScope` changes A → B (a different identity signs in) → the effect
 *     re-runs: it aborts user A's request, drops A's list, and fires a fresh
 *     RLS-scoped query for user B.
 *   - A `TOKEN_REFRESHED` for the SAME user id does NOT change `authScope`, so
 *     the effect does not re-run and nothing refetches.
 *
 * `authScope` is a CLIENT-STATE invalidation key only — RLS
 * (`user_id = auth.uid()`) remains the ownership boundary; no `user_id` filter
 * is added to the query.
 *
 * STALE CROSS-USER RENDER is blocked synchronously: the committed state carries
 * the `scope` that produced it, and `resolveScope` is consulted every render.
 * Between an identity change and the effect's re-fetch, `state.scope` still
 * points at user A while `authScope` is user B — that render returns a
 * synthetic `loading` result, never user A's `plans`.
 *
 * `refetch()` is a pull-to-refresh / error-retry entry point: it keeps the
 * current list on screen (`refreshing` drives the `RefreshControl`) and only
 * the cold load shows the full-screen spinner.
 */
import { useCallback, useEffect, useState } from 'react';

import { MissingEnvError } from '@/lib/env';

import type { PlanSummary } from '../types';
import { fetchMyPlans } from '../services/fetchMyPlans';
import { type AuthScope, resolveScope } from '../lib/authScope';

export type MyPlansStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseMyPlansResult {
  status: MyPlansStatus;
  plans: PlanSummary[];
  /** User-safe message, set only when `status === 'error'`. */
  error: string | null;
  /** `true` when the failure is missing Supabase configuration. */
  isConfigError: boolean;
  /** `true` while a `refetch()` runs with a list already on screen. */
  refreshing: boolean;
  refetch: () => void;
}

interface InternalState {
  status: MyPlansStatus;
  plans: PlanSummary[];
  error: string | null;
  isConfigError: boolean;
  /**
   * The auth scope whose data this state holds. `null` before any load
   * commits; a real user id once a load (success or error) has run. Travels
   * atomically with the data so a render can never see one without the other.
   */
  scope: AuthScope;
}

const QUERY_ERROR_MESSAGE = '載入餐單時發生錯誤，請稍後再試。';
const CONFIG_ERROR_MESSAGE = '應用程式尚未完成設定，暫時無法載入餐單。';

const IDLE_STATE: InternalState = {
  status: 'idle',
  plans: [],
  error: null,
  isConfigError: false,
  scope: null,
};

export function useMyPlans({
  authScope,
}: {
  authScope: AuthScope;
}): UseMyPlansResult {
  const [state, setState] = useState<InternalState>(IDLE_STATE);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    if (authScope === null) {
      setState(IDLE_STATE);
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    // Keep an already-loaded list visible during a manual refresh, but only
    // when it belongs to the SAME scope; an identity change always drops to
    // the full-screen spinner.
    setState((prev) =>
      prev.status === 'success' && prev.scope === authScope
        ? prev
        : {
            status: 'loading',
            plans: [],
            error: null,
            isConfigError: false,
            scope: authScope,
          },
    );

    fetchMyPlans({ signal: controller.signal })
      .then((rows) => {
        if (cancelled) return;
        setState({
          status: 'success',
          plans: rows,
          error: null,
          isConfigError: false,
          scope: authScope,
        });
        setRefreshing(false);
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        const configError = err instanceof MissingEnvError;
        if (__DEV__) {
          const detail = err instanceof Error ? err.message : String(err);
          console.warn('[useMyPlans] load failed:', detail);
        }
        setState({
          status: 'error',
          plans: [],
          error: configError ? CONFIG_ERROR_MESSAGE : QUERY_ERROR_MESSAGE,
          isConfigError: configError,
          scope: authScope,
        });
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authScope, reloadIndex]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    setReloadIndex((n) => n + 1);
  }, []);

  // SYNCHRONOUS stale-scope guard. If `state` was produced under a different
  // identity than the one currently signed in, never surface it — the effect
  // above will re-fetch, but this render must not leak user A's list while
  // that runs.
  const resolution = resolveScope(state.scope, authScope);
  if (resolution !== 'show') {
    return {
      status: resolution === 'idle' ? 'idle' : 'loading',
      plans: [],
      error: null,
      isConfigError: false,
      refreshing: false,
      refetch,
    };
  }

  return {
    status: state.status,
    plans: state.plans,
    error: state.error,
    isConfigError: state.isConfigError,
    refreshing,
    refetch,
  };
}
