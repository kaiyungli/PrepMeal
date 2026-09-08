/**
 * Dedicated lean recipe read for client-side Generate. Read-only.
 *
 * Source of truth: the same `recipes` table the web app reads. Like
 * `mobile/src/features/recipes/services/fetchRecipes.ts` this:
 *   - filters `.eq('is_public', true)` (mirrors the "read public recipes" RLS
 *     policy — a redundant client filter, not a security boundary)
 *   - orders `created_at desc, id desc` (newest, stable secondary key)
 * so the Generate candidate pool is the current public catalogue, newest first.
 *
 * WHY A DEDICATED SERVICE (not `fetchRecipes` / `get_recipe_list_with_detail_json`):
 * the planner needs `dish_type / method / meal_role / is_complete_meal /
 * protein[] / speed / diet / flavor / description`, none of which the 8-column
 * summary query returns; and the list-with-detail RPC ships every step's text +
 * full ingredient rows for zero planner benefit. See
 * `mobile-slice-4d-b-generate-readiness.md` §2.
 *
 * COLUMNS — exactly the frozen 17 (§1g of the readiness doc). `created_at` is
 * used for ORDER BY but deliberately NOT selected. `canonical_ingredients` /
 * `ingredients_list` / `budget_level` / nutrition are deliberately NOT fetched
 * (the web planner never selects them; fetching them would change behaviour).
 *
 * CACHE: a module-scoped session cache (5-min TTL, single-flight) — never
 * `sessionStorage` (RN has none). `force: true` bypasses the freshness check but
 * still joins an in-flight request rather than starting a second. The shared
 * request is NOT bound to any caller's `AbortSignal` (see
 * `generateRecipesCache.ts`): it always runs to completion, and an obsolete
 * caller is dropped by `useGenerateRecipes`'s own `cancelled` guard.
 *
 * Supabase access lives here; the single-flight + TTL bookkeeping is the pure
 * `generateRecipesCache.ts` core; presentation goes through `useGenerateRecipes`.
 */
import { getSupabaseClient } from '@/lib/supabase';

import type { GenerateRecipe } from '../types.ts';
import { mapGenerateRecipeRow, type RawGenerateRow } from '../lib/generateRecipeRow.ts';
import {
  createGenerateRecipesCache,
  type GenerateRecipesFetchOptions,
} from './generateRecipesCache.ts';

/** The exact 17-column projection. `created_at` is ordered-by, not selected. */
export const GENERATE_RECIPE_COLUMNS =
  'id, slug, name, image_url, description, cuisine, dish_type, method, speed, primary_protein, protein, diet, flavor, is_complete_meal, meal_role, total_time_minutes, difficulty';

/**
 * Bounded first-page ceiling for the Generate candidate pool. Matches the mobile
 * recipe-list ceiling (`RECIPE_LIST_FIRST_PAGE_CEILING`) and the generate page's
 * intent; newest-first so it is the freshest 200. (Deliberately not tied to the
 * web `/api/recipes` handler's accidental 100-row clamp — see readiness doc.)
 */
export const GENERATE_RECIPE_LIMIT = 200;

export type FetchGenerateRecipesOptions = GenerateRecipesFetchOptions;

async function runQuery(): Promise<GenerateRecipe[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('recipes')
    .select(GENERATE_RECIPE_COLUMNS)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(GENERATE_RECIPE_LIMIT);

  if (error) {
    throw new Error(`Generate recipe query failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RawGenerateRow[];
  return rows.map(mapGenerateRecipeRow);
}

const cache = createGenerateRecipesCache({ load: runQuery });

/**
 * Load the Generate candidate pool.
 * Throws `MissingEnvError` if Supabase env is unset, or a plain `Error` if the
 * query fails.
 */
export function fetchGenerateRecipes(
  options?: FetchGenerateRecipesOptions,
): Promise<GenerateRecipe[]> {
  return cache.fetch(options);
}

/** Test/hot-reload helper. */
export function clearGenerateRecipeCache(): void {
  cache.clear();
}
