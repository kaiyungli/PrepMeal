/**
 * Recipe Replacer - Pure logic for replacing a single recipe in plan
 * 
 * Uses recipeScorer internally for diversity-based selection.
 */
import { scoreCandidates } from './recipeScorer';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { matchesSlotRole, findCandidatesByFallback } from '@/lib/mealPlanner';



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
  availableCandidates: any[],
  options?: {
    dailyComposition?: string;
  }
): Record<string, any[]> | null {
  // Determine target slot role from composition
  const compositionKey = options?.dailyComposition || 'meat_veg';
  const config = COMPOSITION_CONFIG[compositionKey as keyof typeof COMPOSITION_CONFIG] || COMPOSITION_CONFIG.meat_veg;
  const slotRoles = config.slotRoles || ['any'];
  
  // Determine which slot role this position should have
  const targetSlotRole = slotRoles[index % slotRoles.length] || 'any';
  
  // Get current recipes for scoring context
  const allExistingRecipes = Object.values(weeklyPlan)
    .flat()
    .filter(r => r);
  
  // Use shared fallback finder (same logic as planner)
  const usedRecipeIds = new Set(allExistingRecipes.map(r => r.id));
  let candidatesInDay = findCandidatesByFallback(
    availableCandidates,
    targetSlotRole,
    usedRecipeIds
  );
  
  // Filter out same-day duplicates
  candidatesInDay = candidatesInDay.filter(
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
