/**
 * Recipe detail read service (mobile).
 *
 * Single authoritative source: the `public.get_recipe_detail_json(p_id_or_slug)`
 * RPC — the same function the web detail path calls
 * (`src/features/recipes/services/getRecipeDetail.ts`).
 *
 * ACCESS MODEL (verified against the live database, Slice 3): the function is
 * `SECURITY DEFINER`, `anon` and `authenticated` both hold `EXECUTE`, and a
 * `SET ROLE anon` smoke test returned detail successfully. The function resolves
 * the recipe by UUID or slug and only returns data when `recipes.is_public =
 * true`, so visibility is enforced server-side — mobile passes the identifier
 * straight through. One round trip returns the recipe plus ordered `ingredients`
 * (`recipe_ingredients.created_at ASC, id ASC`) and `steps`
 * (`recipe_steps.step_no ASC`); the client preserves that order and does not
 * re-sort. No multi-query fallback and no web-API round trip in this slice.
 *
 * Read-only. No service-role key, no secrets. Presentation components must not
 * import the Supabase client — they go through `useRecipeDetail`.
 *
 * MAPPING: the raw-payload normalization (`mapRecipeDetail` and everything it
 * depends on) lives in `../lib/recipeDetailMapper.ts`, not here — it's shared
 * verbatim with `fetchRecipeListWithDetail.ts`, since
 * `get_recipe_list_with_detail_json` embeds the identical per-recipe shape
 * this RPC returns. `mapRecipeDetail` is re-exported below so nothing
 * importing it from this path needs to change.
 */
import type { RecipeDetail } from '@/types/recipe';
import { getSupabaseClient } from '@/lib/supabase';

import { mapRecipeDetail, type RawRecipeDetail } from '../lib/recipeDetailMapper';

export { mapRecipeDetail };

const RPC_NAME = 'get_recipe_detail_json';

/**
 * Thrown when the RPC resolves no recipe (unknown id/slug, or the recipe is not
 * public). Lets the hook render a distinct "not found" state instead of a
 * generic query error.
 */
export class RecipeNotFoundError extends Error {
  constructor(idOrSlug: string) {
    super(`Recipe not found: ${idOrSlug}`);
    this.name = 'RecipeNotFoundError';
  }
}

/**
 * Guard the RPC payload against the verified `get_recipe_detail_json` contract
 * before mapping. A payload that breaks the contract is a data error, not a
 * "not found" — it must surface as the generic error state, never as a fake
 * successful detail. Genuinely nullable optional fields still degrade to null.
 */
function assertValidDetailPayload(
  data: unknown,
  idOrSlug: string,
): asserts data is RawRecipeDetail {
  const invalid = (reason: string): never => {
    throw new Error(
      `Recipe detail query failed: malformed RPC payload for "${idOrSlug}" (${reason})`,
    );
  };

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    invalid('not a JSON object');
  }
  const row = data as Record<string, unknown>;
  if (typeof row.id !== 'string' || row.id.trim() === '') {
    invalid('missing non-empty string id');
  }
  if (typeof row.name !== 'string') {
    invalid('missing string name');
  }
}

export interface FetchRecipeDetailOptions {
  /** Aborts the in-flight request (used on unmount / param change / refetch). */
  signal?: AbortSignal;
}

/**
 * Load one recipe's detail by UUID or slug.
 * Throws `MissingEnvError` if Supabase env is not configured,
 * `RecipeNotFoundError` if the RPC resolves nothing, or a plain `Error` if the
 * query itself fails.
 */
export async function fetchRecipeDetail(
  idOrSlug: string,
  { signal }: FetchRecipeDetailOptions = {},
): Promise<RecipeDetail> {
  const supabase = getSupabaseClient();

  let query = supabase.rpc(RPC_NAME, { p_id_or_slug: idOrSlug });

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Recipe detail query failed: ${error.message}`);
  }

  if (data == null) {
    throw new RecipeNotFoundError(idOrSlug);
  }

  assertValidDetailPayload(data, idOrSlug);

  return mapRecipeDetail(data);
}
