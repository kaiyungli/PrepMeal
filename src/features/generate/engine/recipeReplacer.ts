/**
 * Recipe Replacer - Pure logic for replacing a single recipe in plan
 * 
 * Uses recipeScorer internally for diversity-based selection.
 */
import { scoreCandidates } from './recipeScorer';

/**
 * Replace a recipe at a specific slot in the weekly plan
 * @param weeklyPlan - Current weekly plan
 * @param dayKey - Day key (e.g., 'mon', 'tue')
 * @param index - Recipe index in that day's slots
 * @param availableCandidates - Recipes available for replacement
 * @returns Updated weekly plan or null if no replacement available
 */
export function replaceRecipeInPlan(
  weeklyPlan: Record<string, any[]>,
  dayKey: string,
  index: number,
  availableCandidates: any[]
): Record<string, any[]> | null {
  // Get current recipes for scoring context
  const allExistingRecipes = Object.values(weeklyPlan)
    .flat()
    .filter(r => r);
  
  // Filter out recipes already in this day's slot
  const candidatesInDay = availableCandidates.filter(
    candidate => !weeklyPlan[dayKey]?.some(pr => pr?.id === candidate.id)
  );
  
  // Score candidates for diversity
  const scored = scoreCandidates(candidatesInDay, allExistingRecipes);
  
  if (scored.length === 0) {
    return null;
  }
  
  // Pick highest scoring recipe
  const selected = scored[0]?.recipe;
  
  if (!selected) {
    return null;
  }
  
  // Return updated plan
  const dayRecipes = [...(weeklyPlan[dayKey] || [])];
  dayRecipes[index] = selected;
  
  return { ...weeklyPlan, [dayKey]: dayRecipes };
}
