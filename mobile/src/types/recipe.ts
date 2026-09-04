/**
 * Minimal recipe shape for list / card rendering in upcoming slices.
 *
 * Field names mirror the web app's recipe rows (see
 * `src/features/generate/services/fetchAvailableRecipes.ts` on web) so a shared
 * fetch layer can be introduced later without a rename pass. This is a summary
 * only — the full recipe-detail shape (ingredients, steps, nutrition) is
 * deliberately out of scope for this slice.
 */
export type RecipeId = string | number;

export interface RecipeSummary {
  id: RecipeId;
  name: string;
  image_url: string | null;
  cuisine: string | null;
  difficulty: string | null;
  total_time_minutes: number | null;
  primary_protein: string | null;
}
