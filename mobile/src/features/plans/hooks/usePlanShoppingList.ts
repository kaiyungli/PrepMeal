/**
 * Plan shopping-list controller hook (Slice 4C).
 *
 * A near-exact structural copy of `usePlanDetail` -- same stale-request
 * discipline, same DUAL-AXIS (identity + normalized route id) synchronous
 * stale-render guard -- reusing the SAME helpers rather than duplicating the
 * logic:
 *
 *   - `normalizePlanId`        -- malformed / missing id -> `null` -> the
 *                                 neutral not-found state (never a Postgres
 *                                 invalid-uuid error).
 *   - `authScope` (`AuthScope`) -- the stable signed-in `user.id`, or `null`
 *                                 while restoring / signed out. A same-user
 *                                 `TOKEN_REFRESHED` does NOT change it, so it
 *                                 does NOT refetch. An A -> B identity change
 *                                 aborts A's request, drops A's list, and
 *                                 refetches for B.
 *   - `resolvePlanDetailScope` -- consulted every render: the committed state
 *                                 is surfaced ONLY when BOTH the identity AND
 *                                 the normalized route id that produced it
 *                                 still match. Between a user A -> B switch OR
 *                                 a plan A -> B route change and the effect's
 *                                 re-fetch, this render reports `loading` --
 *                                 user A's shopping list can never paint for
 *                                 user B, and plan A's list can never paint
 *                                 for one frame on the plan-B route.
 *
 * `authScope` is a CLIENT-STATE invalidation key only -- the RPC's in-body
 * `menu_plans.user_id = auth.uid()` check remains the ownership boundary.
 *
 * NOT-FOUND is a first-class state, distinct from `error` and from `empty`:
 * an unknown id, a malformed id, and a plan owned by another user all land on
 * `notFound` and render identically. An owned plan with nothing to buy lands
 * on `success` with `categories: []` -> the screen shows its empty state.
 */
import { useCallback, useEffect, useState } from 'react';

import { MissingEnvError } from '@/lib/env';

import {
  fetchPlanShoppingList,
  PlanShoppingListNotFoundError,
} from '../services/fetchPlanShoppingList';
import type { ShoppingListCategory } from '../lib/shoppingListModel';
import { normalizePlanId } from '../lib/planId';
import type { AuthScope } from '../lib/authScope';
import { resolvePlanDetailScope } from '../lib/planDetailScope';

export type PlanShoppingListStatus =
  | 'loading'
  | 'success'
  | 'notFound'
  | 'error';

export interface UsePlanShoppingListResult {
  status: PlanShoppingListStatus;
  categories: ShoppingListCategory[];
  /** Distinct ingredient lines; `0` with `status === 'success'` -> empty state. */
  itemCount: number;
  /** User-safe message, set only when `status === 'error'`. */
  error: string | null;
  isConfigError: boolean;
  refetch: () => void;
}

interface InternalState {
  status: PlanShoppingListStatus;
  categories: ShoppingListCategory[];
  itemCount: number;
  error: string | null;
  isConfigError: boolean;
  /** The auth scope whose data this state holds. Travels atomically with it. */
  scope: AuthScope;
  /** The normalized plan id whose data this state holds. Travels with it. */
  planId: string | null;
}

const QUERY_ERROR_MESSAGE = '載入購物清單時發生錯誤，請稍後再試。';
const CONFIG_ERROR_MESSAGE = '應用程式尚未完成設定，暫時無法載入購物清單。';

const LOADING_STATE: InternalState = {
  status: 'loading',
  categories: [],
  itemCount: 0,
  error: null,
  isConfigError: false,
  scope: null,
  planId: null,
};

const NOT_FOUND_STATE: InternalState = {
  status: 'notFound',
  categories: [],
  itemCount: 0,
  error: null,
  isConfigError: false,
  scope: null,
  planId: null,
};

export function usePlanShoppingList(
  rawPlanId: string | string[] | undefined,
  { authScope }: { authScope: AuthScope },
): UsePlanShoppingListResult {
  const planId = normalizePlanId(rawPlanId ?? null);

  const [state, setState] = useState<InternalState>(LOADING_STATE);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    if (authScope === null) {
      setState(LOADING_STATE);
      return;
    }
    if (!planId) {
      setState({ ...NOT_FOUND_STATE, scope: authScope, planId });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setState((prev) =>
      prev.status === 'success' &&
      prev.scope === authScope &&
      prev.planId === planId
        ? prev
        : { ...LOADING_STATE, scope: authScope, planId },
    );

    fetchPlanShoppingList(planId, { signal: controller.signal })
      .then(({ categories, itemCount }) => {
        if (cancelled) return;
        setState({
          status: 'success',
          categories,
          itemCount,
          error: null,
          isConfigError: false,
          scope: authScope,
          planId,
        });
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        if (err instanceof PlanShoppingListNotFoundError) {
          setState({ ...NOT_FOUND_STATE, scope: authScope, planId });
          return;
        }
        const configError = err instanceof MissingEnvError;
        if (__DEV__) {
          const detail = err instanceof Error ? err.message : String(err);
          console.warn('[usePlanShoppingList] load failed:', detail);
        }
        setState({
          status: 'error',
          categories: [],
          itemCount: 0,
          error: configError ? CONFIG_ERROR_MESSAGE : QUERY_ERROR_MESSAGE,
          isConfigError: configError,
          scope: authScope,
          planId,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [planId, authScope, reloadIndex]);

  const refetch = useCallback(() => {
    setReloadIndex((n) => n + 1);
  }, []);

  // SYNCHRONOUS stale-render guard along BOTH axes -- identical to usePlanDetail.
  const resolution = resolvePlanDetailScope(
    state.scope,
    state.planId,
    authScope,
    planId,
  );
  if (resolution !== 'show') {
    return {
      status: 'loading',
      categories: [],
      itemCount: 0,
      error: null,
      isConfigError: false,
      refetch,
    };
  }

  return {
    status: state.status,
    categories: state.categories,
    itemCount: state.itemCount,
    error: state.error,
    isConfigError: state.isConfigError,
    refetch,
  };
}
