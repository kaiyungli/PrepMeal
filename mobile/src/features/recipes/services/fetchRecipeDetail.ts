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
 */
import type {
  RecipeDetail,
  RecipeDetailIngredient,
  RecipeDetailStep,
} from '@/types/recipe';
import { getSupabaseClient } from '@/lib/supabase';

const RPC_NAME = 'get_recipe_detail_json';
const FALLBACK_RECIPE_NAME = '未命名食譜';

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
 * Shape of the JSON the RPC returns. `id` / `name` are enforced by
 * `assertValidDetailPayload`; every other field is defensively optional and may
 * be null.
 */
interface RawUnit {
  code?: string | null;
  name?: string | null;
}
interface RawIngredient {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  shopping_category?: string | null;
  quantity?: number | null;
  unit?: RawUnit | null;
}
interface RawStep {
  step_no?: number | null;
  text?: string | null;
  time_seconds?: number | null;
}
interface RawRecipeDetail {
  id: string;
  name: string;
  image_url?: string | null;
  description?: string | null;
  cuisine?: string | null;
  difficulty?: string | null;
  method?: string | null;
  total_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  prep_time_minutes?: number | null;
  primary_protein?: string | null;
  ingredients?: RawIngredient[] | null;
  steps?: RawStep[] | null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapIngredient(raw: RawIngredient): RecipeDetailIngredient {
  const unit = raw.unit;
  return {
    id: toNullableString(raw.id) ?? '',
    name: toNullableString(raw.name) ?? '',
    slug: toNullableString(raw.slug),
    shopping_category: toNullableString(raw.shopping_category),
    quantity: toNullableNumber(raw.quantity),
    unit:
      unit && typeof unit === 'object'
        ? {
            code: toNullableString(unit.code) ?? '',
            name: toNullableString(unit.name) ?? '',
          }
        : null,
  };
}

function mapStep(raw: RawStep): RecipeDetailStep {
  return {
    step_no: toNullableNumber(raw.step_no) ?? 0,
    text: toNullableString(raw.text) ?? '',
    time_seconds: toNullableNumber(raw.time_seconds),
  };
}

/**
 * Normalize the raw RPC payload. Ingredient / step arrays keep their RPC order.
 */
export function mapRecipeDetail(raw: RawRecipeDetail): RecipeDetail {
  return {
    id: raw.id,
    name: toNullableString(raw.name) ?? FALLBACK_RECIPE_NAME,
    image_url: toNullableString(raw.image_url),
    description: toNullableString(raw.description),
    cuisine: toNullableString(raw.cuisine),
    difficulty: toNullableString(raw.difficulty),
    method: toNullableString(raw.method),
    total_time_minutes: toNullableNumber(raw.total_time_minutes),
    cook_time_minutes: toNullableNumber(raw.cook_time_minutes),
    prep_time_minutes: toNullableNumber(raw.prep_time_minutes),
    primary_protein: toNullableString(raw.primary_protein),
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map(mapIngredient)
      : [],
    steps: Array.isArray(raw.steps) ? raw.steps.map(mapStep) : [],
  };
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
