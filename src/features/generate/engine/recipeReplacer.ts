import { scoreCandidates } from './recipeScorer';
import { getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Get recent recipes for diversity (narrow window: previous 1-2 days only)
 */
function getRecentRecipesForDiversity(weeklyPlan: Record<string, any[]>, dayKey: string): any[] {
  const currentIdx = DAY_ORDER.indexOf(dayKey);
  if (currentIdx <= 0) return []; // No previous days
  
  // Collect from previous 1-2 days only
  const recent: any[] = [];
  for (let i = 1; i <= 2; i++) {
    const prevDay = DAY_ORDER[currentIdx - i];
    if (prevDay && weeklyPlan[prevDay]) {
      recent.push(...weeklyPlan[prevDay].filter(Boolean));
    }
  }
  
  return recent;
}

/**
 * Check if candidate repeats recent protein or method
 */
function hasRecentDuplicate(candidate: any, recentRecipes: any[]): boolean {
  if (!recentRecipes.length) return false;
  
  const recentProteins = recentRecipes.map(r => r.primary_protein).filter(Boolean);
  const recentMethods = recentRecipes.map(r => r.method).filter(Boolean);
  
  return (
    (candidate.primary_protein && recentProteins.includes(candidate.primary_protein)) ||
    (candidate.method && recentMethods.includes(candidate.method))
  );
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
  
  // Diversity filter: prefer candidates that don't repeat recent protein/method
  const recent = getRecentRecipesForDiversity(weeklyPlan, dayKey);
  const diverseCandidates = candidates.filter(c => !hasRecentDuplicate(c, recent));
  
  const filteredCandidates = diverseCandidates.length > 0 ? diverseCandidates : candidates;
  
  const scored = scoreCandidates(filteredCandidates, existing);
  const selected = scored?.[0]?.recipe;
  
  if (!selected) return null;
  
  const dayRecipes = [...(weeklyPlan[dayKey] || [])];
  dayRecipes[index] = selected;
  
  return { ...weeklyPlan, [dayKey]: dayRecipes };
}
