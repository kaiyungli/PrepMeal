/**
 * Recipe Replacer - Pure logic for replacing a single recipe in plan
 * 
 * Uses recipeScorer internally for diversity-based selection.
 */
import { scoreCandidates } from './recipeScorer';
import { COMPOSITION_CONFIG } from '@/constants/composition';

// Inlined slot role matching (same logic as mealPlanner.ts)
function matchesSlotRole(recipe: any, slotRole: string): boolean {
  const mealRole = recipe.meal_role;
  const dishType = recipe.dish_type;
  const isCompleteMeal = recipe.is_complete_meal;
  const primaryProtein = recipe.primary_protein;
  
  switch (slotRole) {
    case 'complete_meal':
      return mealRole === 'complete_meal' || isCompleteMeal === true;
    case 'protein_main':
      if (mealRole === 'protein_main') return true;
      if (dishType === 'main') return true;
      if (!!primaryProtein) return true;
      return false;
    case 'veg_side':
      if (mealRole === 'veg_side') return true;
      if (dishType === 'side' && !primaryProtein) return true;
      return false;
    default:
      return true;
  }
}

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
  
  // Filter by slot role - only candidates matching the target role can replace
  const roleMatchedCandidates = availableCandidates.filter(candidate => 
    matchesSlotRole(candidate, targetSlotRole)
  );
  
  // Filter out recipes already in this day's slot
  const candidatesInDay = roleMatchedCandidates.filter(
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
