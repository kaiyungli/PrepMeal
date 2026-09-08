/**
 * Plan-detail controller hook.
 *
 * Same stale-request discipline as `useRecipeDetail`: one `AbortController`
 * per run cancels both in-flight queries on unmount, id change, retry, or a
 * sign-out; a `cancelled` flag blocks any late `setState`.
 *
 * `notFound` is a first-class state, distinct from `error`: an unknown id, a
 * malformed id (rejected by `normalizePlanId` before any query), and a plan
 * owned by another user (RLS-filtered) ALL land here, rendered identically —
 * the client never reveals whether an id belongs to someone else.
 *
 * AUTH SCOPING via `authScope` (the stable signed-in `user.id`, or `null` when
 * restoring / signed out — see `../lib/authScope`):
 *   - `authScope === null` → no query fires and the hook reports `'loading'`;
 *     the screen's own auth gate renders the restoring / signed-out UI.
 *   - `authScope` changes A → B → the effect re-runs: it aborts user A's
 *     request, drops A's plan, and fires a fresh RLS-scoped query for user B.
 *   - A `TOKEN_REFRESHED` for the SAME user id does NOT change `authScope`, so
 *     nothing re-runs or refetches.
 *
 * `authScope` is a CLIENT-STATE invalidation key only — RLS
 * (`user_id = auth.uid()`) remains the ownership boundary; no `user_id` filter
 * is added to the query.
 *
 * STALE RENDER is blocked synchronously along BOTH axes: the committed state
 * carries the `scope` AND the normalized `planId` that produced it, and
 * `resolvePlanDetailScope` is consulted every render. Between an identity
 * change (user A → B) OR a route-id change (plan A → B, or → a malformed /
 * missing id) and the effect's re-fetch, the committed `scope` / `planId`
 * still describe the previous view — that render reports `loading`, never the
 * previous user's plan and never the previous id's `plan` / `days`.
 *
 * Grouping by day happens here (via the pure `mapPlanItemsByDay`), never in
 * the presentation layer.
 */
import { useCallback, useEffect, useState } from 'react';

import { MissingEnvError } from '@/lib/env';

import type { PlanDay, PlanDetail } from '../types';
import { fetchPlanDetail, PlanNotFoundError } from '../services/fetchPlanDetail';
import { mapPlanItemsByDay } from '../mappers/mapPlanItemsByDay';
import { normalizePlanId } from '../lib/planId';
import type { AuthScope } from '../lib/authScope';
import { resolvePlanDetailScope } from '../lib/planDetailScope';

export type PlanDetailStatus = 'loading' | 'success' | 'notFound' | 'error';

export interface UsePlanDetailResult {
  status: PlanDetailStatus;
  plan: PlanDetail | null;
  days: PlanDay[];
  /** User-safe message, set only when `status === 'error'`. */
  error: string | null;
  isConfigError: boolean;
  refetch: () => void;
}

interface InternalState {
  status: PlanDetailStatus;
  plan: PlanDetail | null;
  days: PlanDay[];
  error: string | null;
  isConfigError: boolean;
  /**
   * The auth scope whose data this state holds. `null` before any load
   * commits; a real user id once the effect has resolved for a signed-in
   * identity. Travels atomically with the data.
   */
  scope: AuthScope;
  /**
   * The normalized plan id (`normalizePlanId` output) whose data this state
   * holds: a UUID string, or `null` for the missing / malformed / cold cases.
   * Travels atomically with the data so a route-id change is caught
   * synchronously, before the effect re-runs.
   */
  planId: string | null;
}

const QUERY_ERROR_MESSAGE = '載入餐單時發生錯誤，請稍後再試。';
const CONFIG_ERROR_MESSAGE = '應用程式尚未完成設定，暫時無法載入餐單。';

const LOADING_STATE: InternalState = {
  status: 'loading',
  plan: null,
  days: [],
  error: null,
  isConfigError: false,
  scope: null,
  planId: null,
};

const NOT_FOUND_STATE: InternalState = {
  status: 'notFound',
  plan: null,
  days: [],
  error: null,
  isConfigError: false,
  scope: null,
  planId: null,
};

export function usePlanDetail(
  rawPlanId: string | string[] | undefined,
  { authScope }: { authScope: AuthScope },
): UsePlanDetailResult {
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

    fetchPlanDetail(planId, { signal: controller.signal })
      .then(({ plan, items }) => {
        if (cancelled) return;
        setState({
          status: 'success',
          plan,
          days: mapPlanItemsByDay(items),
          error: null,
          isConfigError: false,
          scope: authScope,
          planId,
        });
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        if (err instanceof PlanNotFoundError) {
          setState({ ...NOT_FOUND_STATE, scope: authScope, planId });
          return;
        }
        const configError = err instanceof MissingEnvError;
        if (__DEV__) {
          const detail = err instanceof Error ? err.message : String(err);
          console.warn('[usePlanDetail] load failed:', detail);
        }
        setState({
          status: 'error',
          plan: null,
          days: [],
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

  // SYNCHRONOUS stale-render guard. Surface the committed `state` only when it
  // was produced under BOTH the current identity AND the current normalized
  // route id. A mismatch on either axis — identity A → B, or route plan A → B
  // / → a malformed id — reports `loading` THIS render, before the effect
  // re-runs or its cleanup fires, so a stale plan can never paint for a frame.
  const resolution = resolvePlanDetailScope(
    state.scope,
    state.planId,
    authScope,
    planId,
  );
  if (resolution !== 'show') {
    return {
      status: 'loading',
      plan: null,
      days: [],
      error: null,
      isConfigError: false,
      refetch,
    };
  }

  return {
    status: state.status,
    plan: state.plan,
    days: state.days,
    error: state.error,
    isConfigError: state.isConfigError,
    refetch,
  };
}
