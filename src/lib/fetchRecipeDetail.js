/**
 * fetchRecipeDetail - Single source for loading recipe detail
 * 
 * This is the ONLY place allowed to:
 * - fetch raw recipe detail
 * - normalize it
 * - return final normalized recipe shape
 * 
 * Used by:
 * - API /api/recipes/[id]
 * - Page /recipes/[id]
 */
import { getRecipeDetail } from './recipeDetail';
import { normalizeRecipeDetail } from './normalizeRecipeDetail';

/**
 * Load and normalize recipe detail
 * @param {string} recipeId - Recipe ID
 * @returns {Object} { recipe, error }
 */
export async function fetchRecipeDetail(recipeId) {
  try {
    const { recipe, ingredients, steps } = await getRecipeDetail(recipeId);
    const normalizedRecipe = normalizeRecipeDetail(recipe, ingredients, steps);
    return { recipe: normalizedRecipe, error: null };
  } catch (err) {
    return { recipe: null, error: err.message || 'Failed to load recipe' };
  }
}
