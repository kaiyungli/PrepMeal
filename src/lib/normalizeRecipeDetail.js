/**
 * normalizeRecipeDetail - Shared recipe normalization
 * 
 * Ensures consistent recipe shape for RecipeDetailContent
 */

/**
 * Normalize a single ingredient
 */
export function normalizeIngredient(ing) {
  return {
    name: ing?.display_name || ing?.name || '未知',
    quantity: ing?.quantity ?? '',
    unit: ing?.unit?.name || ing?.unit?.code || ing?.unit || ''
  };
}

/**
 * Normalize a single step
 */
export function normalizeStep(step) {
  if (typeof step === 'string') return step;
  return step?.text || step?.instruction || step?.description || '';
}

/**
 * Normalize full recipe detail
 */
export function normalizeRecipeDetail(recipe, ingredients, steps) {
  return {
    id: recipe?.id || null,
    name: recipe?.name || '未知食譜',
    image_url: recipe?.image_url || null,
    total_time_minutes: recipe?.total_time_minutes || null,
    calories_per_serving: recipe?.calories_per_serving || null,
    servings: recipe?.servings || null,
    description: recipe?.description || '',
    difficulty: recipe?.difficulty || null,
    speed: recipe?.speed || null,
    method: recipe?.method || null,
    ingredients: (ingredients || []).map(normalizeIngredient),
    steps: (steps || []).map(normalizeStep).filter(Boolean)
  };
}
