/**
 * Recipe Detail Public API
 * 
 * Single entry point for loading recipe detail.
 * Combines fetch + normalization.
 */
export { getRecipeDetail, type RecipeDetailRow } from './services/getRecipeDetail';
export { normalizeRecipeDetail, type NormalizedRecipe } from './mappers/normalizeRecipeDetail';

import { getRecipeDetail } from './services/getRecipeDetail';
import { normalizeRecipeDetail } from './mappers/normalizeRecipeDetail';

/**
 * Load and normalize recipe detail
 * @param recipeId - Recipe ID
 * @returns Normalized recipe or null
 */
export async function loadRecipeDetail(recipeId: string) {
  try {
    const recipe = await getRecipeDetail(recipeId);
    return { recipe: normalizeRecipeDetail(recipe), error: null };
  } catch (err) {
    return { recipe: null, error: err instanceof Error ? err.message : 'Failed to load recipe' };
  }
}
