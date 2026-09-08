/**
 * "My plans" read service (mobile).
 *
 * Source of truth: the live `public.menu_plans` table the web app reads
 * (`src/pages/api/user/menus/index.js`). Read-only. No schema, no writes.
 *
 * ACCESS MODEL: mobile uses the shared authenticated Supabase singleton
 * (`@/lib/supabase`), which carries the signed-in user's session. RLS on
 * `public.menu_plans` ("view own menu plans" — `user_id = auth.uid()`) is the
 * real ownership boundary, so this query deliberately does NOT add a
 * `.eq('user_id', …)` filter — the row set is already scoped server-side, and
 * no user id needs to be plumbed through the client for correctness. If the
 * session is missing / anon, RLS simply returns zero rows (an empty list),
 * never another user's plans. The web GET path uses the service-role key to
 * bypass RLS; mobile does NOT — no service-role key ships in the client.
 *
 * ORDERING mirrors the web list: newest first (`created_at desc`), with `id`
 * as a stable secondary key.
 *
 * Supabase access lives here (infrastructure). Presentation components must
 * not import the client — they go through `useMyPlans`. Pure row
 * normalization lives in `../mappers/mapPlanSummary.ts` and is unit-tested
 * there.
 */
import { getSupabaseClient } from '@/lib/supabase';

import type { PlanSummary } from '../types';
import {
  mapPlanSummaryRow,
  type RawPlanSummaryRow,
} from '../mappers/mapPlanSummary';

/** Columns the list card needs — a subset of the web list select. */
const PLAN_LIST_COLUMNS =
  'id, title, start_date, end_date, created_at, avg_servings, item_count, preview_items';

export interface FetchMyPlansOptions {
  /** Aborts the in-flight request (used on unmount / refresh / sign-out). */
  signal?: AbortSignal;
}

/**
 * Load the signed-in user's saved plans, newest first.
 * Throws `MissingEnvError` if Supabase env is not configured, or a plain
 * `Error` if the query fails.
 */
export async function fetchMyPlans(
  { signal }: FetchMyPlansOptions = {},
): Promise<PlanSummary[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('menu_plans')
    .select(PLAN_LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Menu plans query failed: ${error.message}`);
  }

  const rows = (data ?? []) as RawPlanSummaryRow[];
  return rows.map(mapPlanSummaryRow);
}
