/**
 * Recipe read service (mobile).
 *
 * Source of truth: the same `recipes` table the web app reads. Like the web list
 * endpoint (`src/pages/api/recipes/index.js`) and the server card fetch
 * (`src/lib/recipesServer.ts`), this service:
 *   - filters with `.eq('is_public', true)`
 *   - orders by `created_at desc, id desc` (newest, with a stable secondary key)
 * so mobile shows the same recipes the web app considers publicly visible.
 * No schema, no writes, read-only.
 *
 * PAGE SIZE: mobile currently uses a bounded first-page ceiling of 200 rows
 * (`RECIPE_LIST_FIRST_PAGE_CEILING`), which comfortably covers the current
 * low-hundreds public catalog. This is NOT claimed to match the web
 * `/api/recipes` ceiling — it is an independent mobile bound. Pagination /
 * load-more stays deferred until the public catalog approaches or exceeds this
 * ceiling.
 *
 * Supabase access lives here (infrastructure). Presentation components must not
 * import the Supabase client — they go through `useRecipes`.
 *
 * ACCESS MODEL (verified against the live database): mobile uses anon / public
 * Supabase credentials. RLS is enabled and allows `SELECT` only for rows where
 * `is_public = true` ("read public recipes" policy). The explicit
 * `.eq('is_public', true)` below mirrors that policy condition and the web
 * app's visibility behavior; it is a redundant client-side filter, not a
 * security boundary. If anon `SELECT` access were ever revoked, the query
 * returns a PostgREST error that surfaces as the 食譜 tab's error state (with
 * retry) — it never crashes and never weakens RLS.
 */
import type { RecipeSummary } from '@/types/recipe';
import { getSupabaseClient } from '@/lib/supabase';

/** Columns selected for the list view — a subset of the web `LIST_FIELDS`. */
const RECIPE_LIST_COLUMNS =
  'id, slug, name, image_url, total_time_minutes, difficulty, cuisine, primary_protein';

/**
 * Bounded first-page ceiling for the mobile recipe list.
 *
 * Mobile fetches at most this many rows in a single query and renders them all;
 * there is no pagination in this slice. 200 comfortably covers the current
 * low-hundreds public catalog (verified: 188 public recipes). This is an
 * independent mobile bound and is NOT claimed to equal the web `/api/recipes`
 * ceiling. Revisit (add load-more) only as the public catalog approaches or
 * exceeds this number.
 */
export const RECIPE_LIST_FIRST_PAGE_CEILING = 200;

const FALLBACK_RECIPE_NAME = '未命名食譜';

/**
 * Raw `recipes` row as selected above. Snake_case = the actual DB column names;
 * every optional column can be `null`.
 */
interface RecipeListRow {
  id: string | number;
  slug: string | null;
  name: string | null;
  image_url: string | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  cuisine: string | null;
  primary_protein: string | null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Normalize one raw row into the summary the UI consumes. Nullable backend
 * fields stay nullable; only `name` is coerced to a safe fallback (the web
 * card does the same with `recipe?.name || '無名食譜'`). Nothing is fabricated —
 * a missing time / difficulty / cuisine stays `null` and the card omits it.
 */
export function mapRecipeRow(row: RecipeListRow): RecipeSummary {
  return {
    id: row.id,
    slug: toNullableString(row.slug),
    name: toNullableString(row.name) ?? FALLBACK_RECIPE_NAME,
    image_url: toNullableString(row.image_url),
    total_time_minutes: toNullableNumber(row.total_time_minutes),
    difficulty: toNullableString(row.difficulty),
    cuisine: toNullableString(row.cuisine),
    primary_protein: toNullableString(row.primary_protein),
  };
}

export interface FetchRecipesOptions {
  /** Aborts the in-flight request (used on unmount / refetch). */
  signal?: AbortSignal;
}

/**
 * Load the first page of publicly visible recipes, newest first.
 * Throws `MissingEnvError` if Supabase env is not configured, or a plain
 * `Error` if the query fails.
 */
export async function fetchRecipes(
  { signal }: FetchRecipesOptions = {},
): Promise<RecipeSummary[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('recipes')
    .select(RECIPE_LIST_COLUMNS)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(RECIPE_LIST_FIRST_PAGE_CEILING);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Recipe query failed: ${error.message}`);
  }

  const rows = (data ?? []) as RecipeListRow[];
  return rows.map(mapRecipeRow);
}
