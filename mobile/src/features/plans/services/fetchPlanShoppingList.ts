/**
 * Plan shopping-list read service (mobile, Slice 4C). Read-only.
 *
 * Single authoritative source: the `public.get_menu_plan_shopping_list_json(
 * p_plan_id uuid)` RPC (see
 * `supabase/migrations/012_get_menu_plan_shopping_list_json.sql`). One
 * authenticated round trip returns the aggregated "to buy" lines for a saved
 * plan the caller owns.
 *
 * ACCESS MODEL: the shared authenticated Supabase singleton -- NO service-role
 * key. The RPC is `SECURITY DEFINER` and enforces ownership itself
 * (`menu_plans.id = p_plan_id AND menu_plans.user_id = auth.uid()`), so:
 *
 *   - a plan owned by another user, AND a plan id that does not exist, BOTH
 *     resolve to SQL NULL -- indistinguishable. Both surface here as
 *     `PlanShoppingListNotFoundError`, and the screen renders ONE neutral
 *     "not found" state for either, exactly as `fetchPlanDetail` /
 *     `usePlanDetail` already do. The client never learns whether an id
 *     belongs to someone else.
 *   - a plan the caller DOES own always returns `{ "items": [...] }`, possibly
 *     with an empty array (no items, or items whose recipes carry no
 *     ingredient rows) -> `{ categories: [], itemCount: 0 }` -> the screen's
 *     "nothing to buy" empty state, which is distinct from "not found".
 *
 * WHY THIS RPC AND NOT `get_recipe_list_with_detail_json`: that function ships
 * all ~200 public recipes with full detail (description / method / every
 * step's text) and is capped at 200 rows / `is_public = true`, so a saved
 * plan referencing an older or since-unpublished recipe would silently lose
 * items. This plan-scoped RPC returns only the six shopping-list fields per
 * ingredient line, for exactly the recipes this owned plan references, with
 * no cap. See the migration header for the full rationale.
 *
 * AGGREGATION (sum by ingredient, servings scaling, distinct-recipe handling)
 * happens in SQL and mirrors `src/pages/api/shopping-list.ts`. Category and
 * unit/quantity NORMALISATION is pure and lives in
 * `../lib/shoppingListModel.ts`, ported verbatim from the web -- this file is
 * the thin real-network wiring around it and, like `fetchPlanDetail.ts`, has
 * a real `@/lib/supabase` import so it is never loaded by `node --test`.
 *
 * Presentation components must not import the Supabase client -- they go
 * through `usePlanShoppingList`.
 */
import { getSupabaseClient } from '@/lib/supabase';

import {
  groupPlanShoppingList,
  type RawShoppingListRow,
  type ShoppingListCategory,
} from '../lib/shoppingListModel';

const RPC_NAME = 'get_menu_plan_shopping_list_json';

/**
 * Thrown when the RPC returns SQL NULL -- an unknown plan id, or one owned by
 * another user (the two are deliberately indistinguishable).
 */
export class PlanShoppingListNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan shopping list not found: ${planId}`);
    this.name = 'PlanShoppingListNotFoundError';
  }
}

export interface FetchPlanShoppingListOptions {
  /** Aborts the in-flight request (used on unmount / id change / retry). */
  signal?: AbortSignal;
}

export interface PlanShoppingListResult {
  /** Ordered, labelled categories with pre-formatted quantities. Empty when
   *  the owned plan has nothing to buy. */
  categories: ShoppingListCategory[];
  /** Total distinct ingredient lines across all categories (0 == empty plan). */
  itemCount: number;
}

interface RawRpcPayload {
  items?: unknown;
}

/**
 * Load the aggregated shopping list for one owned plan.
 *
 * Throws `MissingEnvError` if Supabase env is not configured,
 * `PlanShoppingListNotFoundError` if the plan resolves to nothing (unknown or
 * not owned), or a plain `Error` if the query itself fails.
 */
export async function fetchPlanShoppingList(
  planId: string,
  { signal }: FetchPlanShoppingListOptions = {},
): Promise<PlanShoppingListResult> {
  const supabase = getSupabaseClient();

  let query = supabase.rpc(RPC_NAME, { p_plan_id: planId });

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Plan shopping list query failed: ${error.message}`);
  }

  // SQL NULL -> not found / not owned (indistinguishable).
  if (data == null) {
    throw new PlanShoppingListNotFoundError(planId);
  }

  const rawItems = (data as RawRpcPayload).items;
  const rows: RawShoppingListRow[] = Array.isArray(rawItems)
    ? (rawItems as RawShoppingListRow[])
    : [];

  return {
    categories: groupPlanShoppingList(rows),
    itemCount: rows.length,
  };
}
