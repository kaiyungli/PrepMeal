/**
 * Minimal recipe shape for list / card rendering.
 *
 * Verified against the current backend reality (Slice 2): the web recipe list
 * endpoint (`src/pages/api/recipes/index.js` `LIST_FIELDS`) and the server card
 * fetch (`src/lib/recipesServer.ts` `CARD_FIELDS`) select these columns from the
 * `recipes` table. Field names are kept in backend snake_case so a shared fetch
 * layer can be introduced later without a rename pass. `id` is a UUID string in
 * the DB; the `string | number` union is kept for tolerance.
 *
 * This is a summary only — the full recipe-detail shape (ingredients, steps,
 * nutrition) is deliberately out of scope.
 */
export type RecipeId = string | number;

export interface RecipeSummary {
  id: RecipeId;
  /** Stable human-readable id; used for detail routing in a later slice. */
  slug: string | null;
  /** Never empty — the fetch mapper substitutes a fallback for a missing name. */
  name: string;
  image_url: string | null;
  cuisine: string | null;
  difficulty: string | null;
  total_time_minutes: number | null;
  primary_protein: string | null;
}
