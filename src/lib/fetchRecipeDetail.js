/**
 * @deprecated Use @/features/recipes instead
 * 
 * This file is kept for backward compatibility.
 * All code should migrate to @/features/recipes which provides:
 * - getRecipeDetail: Single DB access point
 * - normalizeRecipeDetail: Single normalization point
 * - loadRecipeDetail: Combined fetch + normalize
 */
import { loadRecipeDetail } from '@/features/recipes';

// Re-export for backward compatibility
export async function fetchRecipeDetail(recipeId) {
  const { recipe, error } = await loadRecipeDetail(recipeId);
  if (error || !recipe) {
    throw new Error(error || 'Failed to load recipe');
  }
  return recipe;
}
