/**
 * Generate Feature - Public API
 */
export { fetchAvailableRecipes } from './services/fetchAvailableRecipes';
export { saveGeneratedPlan, buildSavePayload } from './services/saveGeneratedPlan';
export { fetchGeneratedPlanShoppingList } from './services/fetchGeneratedPlanShoppingList';

export { generateWeeklyPlan } from './engine/mealPlanner';
export { replaceRecipeInPlan } from './engine/recipeReplacer';
export { scoreRecipeForReplacement, scoreCandidates } from './engine/recipeScorer';

export { normalizePlanForSave } from './mappers/normalizePlanForSave';

export { useGeneratePageController } from './hooks/useGeneratePageController';
