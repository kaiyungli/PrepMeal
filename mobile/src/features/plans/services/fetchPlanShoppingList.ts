/**
 * Owned-plan shopping-list reader. The RPC scales every meal occurrence by
 * its own servings / recipe base servings, and includes public recipes and
 * required ingredients only. Mobile has no optional-ingredient selector.
 *
 * Database contract: supabase/migrations/20261024210700_correct_plan_shopping_quantities.sql.
 * The shared authenticated client calls the ownership-gated RPC without a
 * service-role key. NULL means unknown or unowned; {items: []} means an empty
 * owned plan. Category and display formatting live in shoppingListModel.ts.
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
