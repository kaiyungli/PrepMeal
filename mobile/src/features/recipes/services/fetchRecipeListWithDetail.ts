/**
 * Recipe list-with-detail read service (mobile).
 *
 * Single authoritative source: the `public.get_recipe_list_with_detail_json()`
 * RPC — a migration-managed `SECURITY DEFINER` function (see
 * `supabase/migrations/20260905034023_get_recipe_list_with_detail_json.sql`)
 * that returns every current public recipe,
 * newest first, with full detail embedded per row, so a list-originated
 * detail open costs zero additional round trips.
 *
 * ACCESS MODEL: `SECURITY DEFINER`, enforces `is_public = true` itself
 * (independent of child-table RLS — see the migration's header comment),
 * takes no parameters, and `EXECUTE` is granted to `anon` and `authenticated`
 * only. Read-only. No service-role key, no secrets.
 *
 * MAPPING: validation and per-row normalization
 * (`mapRecipeListRows`/`mapRecipeDetail`) live in `../lib/recipeDetailMapper.ts`
 * — the exact same pure module `fetchRecipeDetail.ts` uses, since this RPC's
 * per-recipe shape is identical to `get_recipe_detail_json`'s (plus `slug`).
 * This file is the thin real-network wiring around that pure logic — the
 * same core/wiring split `recipeDetailPrefetch.ts` / `recipeDetailPrefetchCore.ts`
 * already use in this feature, and for the same reason: this file has a real
 * `@/lib/supabase` import, so it (like `fetchRecipeDetail.ts`) is never
 * loaded by this repo's `node --test` runner — the pure mapping/validation it
 * delegates to is what's unit-tested, in `recipeDetailMapper.test.ts`.
 *
 * ALL-OR-NOTHING: `mapRecipeListRows` throws on the first malformed row
 * instead of returning a partial array, so a caller of this function either
 * gets the complete, fully-mapped list or an error — never a partial one to
 * accidentally warm a cache from.
 *
 * Presentation components must not import the Supabase client — they go
 * through `useRecipes`.
 */
import type { RecipeListDetail } from '@/types/recipe';
import { getSupabaseClient } from '@/lib/supabase';

import { mapRecipeListRows } from '../lib/recipeDetailMapper';

const RPC_NAME = 'get_recipe_list_with_detail_json';

export interface FetchRecipeListWithDetailOptions {
  /** Aborts the in-flight request (used on unmount / refetch). */
  signal?: AbortSignal;
}

/**
 * Load every publicly visible recipe (server-bounded to the current 200-row
 * first-page contract, newest first) with full detail embedded.
 *
 * Throws `MissingEnvError` if Supabase env is not configured, or a plain
 * `Error` if the query fails or the response fails validation
 * (`mapRecipeListRows` — all-or-nothing, never a partial array).
 */
export async function fetchRecipeListWithDetail(
  { signal }: FetchRecipeListWithDetailOptions = {},
): Promise<RecipeListDetail[]> {
  const supabase = getSupabaseClient();

  let query = supabase.rpc(RPC_NAME);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Recipe list query failed: ${error.message}`);
  }

  return mapRecipeListRows(data);
}
