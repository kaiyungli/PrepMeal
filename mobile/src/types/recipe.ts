/**
 * Recipe shapes for list / card rendering (`RecipeSummary`) and the detail
 * screen (`RecipeDetail`).
 *
 * Verified against the current backend reality: the web recipe list endpoint
 * (`src/pages/api/recipes/index.js` `LIST_FIELDS`) and the server card fetch
 * (`src/lib/recipesServer.ts` `CARD_FIELDS`) drive `RecipeSummary` (Slice 2);
 * the `public.get_recipe_detail_json(p_id_or_slug)` RPC drives `RecipeDetail`
 * (Slice 3). Field names are kept in backend snake_case so a shared fetch layer
 * can be introduced later without a rename pass. `id` is a UUID string in the
 * DB; the `string | number` union is kept for tolerance.
 */
export type RecipeId = string | number;

export interface RecipeSummary {
  id: RecipeId;
  /** Stable human-readable id; preferred key for detail routing. */
  slug: string | null;
  /** Never empty — the fetch mapper substitutes a fallback for a missing name. */
  name: string;
  image_url: string | null;
  cuisine: string | null;
  difficulty: string | null;
  total_time_minutes: number | null;
  primary_protein: string | null;
}

/**
 * One ingredient row from the detail RPC. Order is fixed by the RPC
 * (`recipe_ingredients.created_at ASC, id ASC`) — the client preserves it and
 * never re-sorts. `quantity` stays nullable; the web card only coerces it to `1`
 * for display, not in data.
 */
export interface RecipeDetailIngredient {
  id: string;
  name: string;
  slug: string | null;
  shopping_category: string | null;
  quantity: number | null;
  unit: { code: string; name: string } | null;
}

/** One step from the detail RPC, ordered by `recipe_steps.step_no ASC`. */
export interface RecipeDetailStep {
  step_no: number;
  text: string;
  time_seconds: number | null;
}

/**
 * Normalized recipe detail — the subset of the `get_recipe_detail_json` payload
 * the mobile detail screen renders. Nutrition, `diet`, `dish_type`, `speed` and
 * `is_complete_meal` exist in the RPC response but are intentionally out of
 * scope for this slice.
 */
export interface RecipeDetail {
  /**
   * UUID string. The verified `get_recipe_detail_json` contract always returns a
   * non-empty string id; `fetchRecipeDetail` rejects any payload that doesn't.
   */
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  cuisine: string | null;
  difficulty: string | null;
  method: string | null;
  total_time_minutes: number | null;
  cook_time_minutes: number | null;
  prep_time_minutes: number | null;
  primary_protein: string | null;
  ingredients: RecipeDetailIngredient[];
  steps: RecipeDetailStep[];
}

/**
 * One row from `get_recipe_list_with_detail_json` — a `RecipeSummary` row
 * with full `RecipeDetail` embedded, so a list-originated detail open needs
 * zero additional network round trips. Structurally satisfies `RecipeSummary`
 * (existing list/card code accepts it unchanged) — it's exactly
 * `RecipeDetail` plus the one summary field that RPC doesn't return
 * (`slug`; the single-recipe RPC omits it because the caller already
 * supplies an identifier).
 */
export type RecipeListDetail = RecipeDetail & Pick<RecipeSummary, 'slug'>;
