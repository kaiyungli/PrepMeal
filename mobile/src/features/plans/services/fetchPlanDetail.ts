/**
 * Plan-detail read service (mobile).
 *
 * Source of truth: the live `public.menu_plans` / `public.menu_plan_items`
 * tables (`src/features/plans/server/getMenuPlanDetail.ts` on web). Read-only.
 *
 * ACCESS MODEL: the shared authenticated Supabase singleton. RLS enforces
 * ownership on BOTH tables:
 *   - `menu_plans`      — `user_id = auth.uid()`
 *   - `menu_plan_items` — `EXISTS (… menu_plans WHERE id = menu_plan_id AND
 *                          user_id = auth.uid())`
 * so a plan owned by another user resolves to NO row here — identical to a
 * plan that does not exist. Both surface as `PlanNotFoundError`, and the
 * caller renders one neutral "not found" state for either. The client never
 * learns whether an id belongs to someone else. No service-role key.
 *
 * TWO ROUND TRIPS, never N+1:
 *   1. the plan row (`.maybeSingle()` — RLS-filtered / missing → `null`).
 *   2. all its items in one query, each with its recipe embedded via a
 *      `recipes(...)` join. A non-public / deleted recipe simply embeds as
 *      `null` (child-table RLS) and the row renders with a fallback name.
 * The grouping-by-day mapper re-sorts deterministically, so the query order
 * is a convenience, not a correctness dependency.
 *
 * Presentation components must not import the client — they go through
 * `usePlanDetail`. Pure normalization lives in `../mappers/mapPlanItem.ts`.
 */
import { getSupabaseClient } from '@/lib/supabase';

import type { PlanDetail, PlanItem } from '../types';
import {
  mapPlanDetailRow,
  mapPlanItemRow,
  type RawPlanDetailRow,
  type RawPlanItemRow,
} from '../mappers/mapPlanItem';

const PLAN_COLUMNS = 'id, title, start_date, end_date, avg_servings, item_count';
const ITEM_COLUMNS =
  'id, date, meal_slot, servings, item_order, recipe_id, recipes ( id, slug, name, image_url )';

/**
 * Thrown when the plan resolves to no row — unknown id, or owned by another
 * user (RLS-filtered). The two are deliberately indistinguishable.
 */
export class PlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`);
    this.name = 'PlanNotFoundError';
  }
}

export interface FetchPlanDetailOptions {
  /** Aborts both in-flight requests (used on unmount / id change / retry). */
  signal?: AbortSignal;
}

export interface PlanDetailResult {
  plan: PlanDetail;
  items: PlanItem[];
}

/**
 * Load one owned plan and its items.
 * Throws `MissingEnvError` if Supabase env is not configured,
 * `PlanNotFoundError` if the plan resolves to nothing, or a plain `Error` if
 * a query itself fails.
 */
export async function fetchPlanDetail(
  planId: string,
  { signal }: FetchPlanDetailOptions = {},
): Promise<PlanDetailResult> {
  const supabase = getSupabaseClient();

  let planQuery = supabase
    .from('menu_plans')
    .select(PLAN_COLUMNS)
    .eq('id', planId);

  if (signal) {
    planQuery = planQuery.abortSignal(signal);
  }

  const { data: planRow, error: planError } = await planQuery.maybeSingle();

  if (planError) {
    throw new Error(`Plan query failed: ${planError.message}`);
  }
  if (!planRow) {
    throw new PlanNotFoundError(planId);
  }

  let itemsQuery = supabase
    .from('menu_plan_items')
    .select(ITEM_COLUMNS)
    .eq('menu_plan_id', planId)
    .order('date', { ascending: true })
    .order('item_order', { ascending: true });

  if (signal) {
    itemsQuery = itemsQuery.abortSignal(signal);
  }

  const { data: itemRows, error: itemsError } = await itemsQuery;

  if (itemsError) {
    throw new Error(`Plan items query failed: ${itemsError.message}`);
  }

  return {
    plan: mapPlanDetailRow(planRow as RawPlanDetailRow),
    items: ((itemRows ?? []) as RawPlanItemRow[]).map(mapPlanItemRow),
  };
}
