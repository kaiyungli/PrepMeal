import { Recipe } from './recipeScorer';
import { scoreCandidates } from './recipeScorer';

export function replaceRecipeInPlan(
  weeklyPlan: Record<string, any[]>,
  dayKey: string,
  index: number,
  availableCandidates: any[],
  options?: {
    dailyComposition?: string;
  }
): Record<string, any[]> | null {
  // Determine target slot role from composition and index
  const compositionKey = options?.dailyComposition || 'meat_veg';
  const slotRoles = compositionKey === 'meat_veg' ? ['protein_main', 'veg_side'] : 
                   compositionKey === 'two_protein' ? ['protein_main', 'protein_main'] :
                   ['any'];
  
  const targetSlotRole = slotRoles[index % slotRoles.length] || 'any';
  
  // Get current recipes for duplicate check
  const allExistingRecipes = Object.values(weeklyPlan).flat().filter(r => r);
  
  // Simple local role filter based on requirements
  function matchesSlotRoleLocal(recipe: Recipe, slotRole: string): boolean {
    if (slotRole === 'protein_main') {
      return !!recipe.primary_protein || recipe.dish_type === 'main';
    }
    if (slotRole === 'veg_side') {
      return !recipe.primary_protein && recipe.dish_type === 'side';
    }
    return true; // 'any' allows all
  }
  
  // Filter candidates by slot role
  let candidatesInDay = availableCandidates.filter(c => matchesSlotRoleLocal(c, targetSlotRole));
  
  // Remove same-day duplicates
  candidatesInDay = candidatesInDay.filter(c => !weeklyPlan[dayKey]?.some(pr => pr?.id === c.id));
  
  if (candidatesInDay.length === 0) {
    return null;
  }
  
  // Use existing scoring for selection
  const selected = scoreCandidates(candidatesInDay, allExistingRecipes, {} as any);
  
  if (!selected || !selected[0]) {
    return null;
  }
  
  // Copy plan and replace
  const newPlan = JSON.parse(JSON.stringify(weeklyPlan));
  newPlan[dayKey] = [...(newPlan[dayKey] || [])];
  newPlan[dayKey][index] = selected[0];
  
  return newPlan;
}