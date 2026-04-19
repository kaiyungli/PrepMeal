import { scoreCandidates } from './recipeScorer';
import { getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

/**
 * Get recent recipes for diversity checking (prevents same-day and cross-day repetition)
 */
function getRecentRecipesForDiversity(weeklyPlan: Record<string, any[]>, dayKey: string): any[] {
  // Get all other days (not current day)
  const otherDays = Object.entries(weeklyPlan)
    .filter(([day]) => day !== dayKey)
    .flatMap(([, recipes]) => recipes)
    .filter(Boolean);
  
  return otherDays;
}

/**
 * Check if candidate repeats recent protein or method
 */
function hasRecentDuplicate(candidate: any, recentRecipes: any[]): boolean {
  if (!recentRecipes.length) return false;
  
  const recentProteins = recentRecipes
    .map(r => r.primary_protein)
    .filter(Boolean);
  
  const recentMethods = recentRecipes
    .map(r => r.method)
    .filter(Boolean);
  
  // Same protein?
  if (candidate.primary_protein && recentProteins.includes(candidate.primary_protein)) {
    return true;
  }
  
  // Same method?
  if (candidate.method && recentMethods.includes(candidate.method)) {
    return true;
  }
  
  return false;
}

export function replaceRecipeInPlan(
  weeklyPlan: Record<string, any[]>,
  dayKey: string,
  index: number,
  availableCandidates: any[],
  options?: { dailyComposition?: string }
): Record<string, any[]> | null {
  const composition = options?.dailyComposition || 'meat_veg';
  const slotRole = getSlotRoleForIndex(composition, index);
  
  const existing = Object.values(weeklyPlan).flat().filter(Boolean);
  
  let candidates = availableCandidates.filter(c => matchesLocalSlotRole(c, slotRole));
  candidates = candidates.filter(c => !weeklyPlan[dayKey]?.some(p => p?.id === c.id));
  
  if (!candidates.length) return null;
  
  // Simple diversity filter: prefer candidates that don't repeat recent protein/method
  const recent = getRecentRecipesForDiversity(weeklyPlan, dayKey);
  const diverseCandidates = candidates.filter(c => !hasRecentDuplicate(c, recent));
  
  // Use diverse if available, otherwise fallback to all candidates
  const filteredCandidates = diverseCandidates.length > 0 ? diverseCandidates : candidates;
  
  const scored = scoreCandidates(filteredCandidates, existing);
  const selected = scored?.[0]?.recipe;
  
  if (!selected) return null;
  
  const dayRecipes = [...(weeklyPlan[dayKey] || [])];
  dayRecipes[index] = selected;
  
  return { ...weeklyPlan, [dayKey]: dayRecipes };
}
