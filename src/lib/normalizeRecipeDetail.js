/**
 * normalizeRecipeDetail - Single normalization boundary for recipe data
 * 
 * This is the ONLY place allowed to transform recipe detail data.
 * API returns already-normalized data. UI layers are dumb (no transformation).
 * 
 * @typedef {Object} NormalizedIngredient
 * @property {string} name
 * @property {string|number} quantity
 * @property {string} unit
 * 
 * @typedef {Object} NormalizedRecipe
 * @property {string|null} id
 * @property {string} name
 * @property {string|null} image_url
 * @property {number|null} total_time_minutes
 * @property {number|null} calories_per_serving
 * @property {number|null} servings
 * @property {string} description
 * @property {string|null} difficulty
 * @property {string|null} speed
 * @property {string|null} method
 * @property {NormalizedIngredient[]} ingredients
 * @property {string[]} steps
 * 
 * @param {Object} recipe - Raw recipe from DB
 * @param {Array} ingredients - Raw ingredients from DB
 * @param {Array} steps - Raw steps from DB
 * @returns {NormalizedRecipe}
 */

export function normalizeRecipeDetail(recipe, ingredients, steps) {
  // Map step to normalized string
  const normalizeStep = (step) => {
    if (typeof step === 'string') return step;
    return step?.text || step?.instruction || step?.description || '';
  };

  // Map ingredient to normalized object
  const normalizeIngredient = (ing) => ({
    name: ing?.display_name || ing?.name || '未知',
    quantity: ing?.quantity ?? '',
    unit: ing?.unit?.name || ing?.unit?.code || ing?.unit || ''
  });

  // Return final normalized shape - the single source of truth
  return {
    // Core fields
    id: recipe?.id || null,
    name: recipe?.name || '未知食譜',
    image_url: recipe?.image_url || null,
    total_time_minutes: recipe?.total_time_minutes || null,
    calories_per_serving: recipe?.calories_per_serving || null,
    servings: recipe?.servings || null,
    description: recipe?.description || '',
    
    // Meta
    difficulty: recipe?.difficulty || null,
    speed: recipe?.speed || null,
    method: recipe?.method || null,
    
    // Collections (always normalized)
    ingredients: (ingredients || []).map(normalizeIngredient),
    steps: (steps || []).map(normalizeStep).filter(Boolean)
  };
}
