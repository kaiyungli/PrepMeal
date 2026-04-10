/**
 * Generate Feature - Public API
 * 
 * IO Boundary Services
 */
export { fetchAvailableRecipes } from './services/fetchAvailableRecipes';
export { saveGeneratedPlan, buildSavePayload } from './services/saveGeneratedPlan';
export { fetchGeneratedPlanShoppingList } from './services/fetchGeneratedPlanShoppingList';

/**
 * Engine - Pure Planning Logic
 */
export { generateWeeklyPlan } from './engine/mealPlanner';
export { replaceRecipeInPlan } from './engine/recipeReplacer';
export { scoreRecipeForReplacement, scoreCandidates } from './engine/recipeScorer';
