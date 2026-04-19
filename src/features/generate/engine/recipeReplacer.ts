import { scoreCandidates } from './recipeScorer';
import { getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Get recent recipes for diversity (previous 1-2 days only)
 */
function getRecentRecipesForDiversity(weeklyPlan: Record<string, any[]>, dayKey: string): any[] {
  const currentIdx = DAY_ORDER.indexOf(dayKey);
  if (currentIdx <= 0) return [];
  
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
function hasRecentDuplicate(candidate: any, recent: any[]): boolean {
  if (!recent.length) return false;
  
  const recentProteins = recent.map(r => r.primary_protein).filter(Boolean);
  const recentMethods = recent.map(r => r.method).filter(Boolean);
  
  return (
    (candidate.primary_protein && recentProteins.includes(candidate.primary_protein)) ||
    (candidate.method && recentMethods.includes(candidate.method))
  );
}

/**
 * Build reason metadata for selection
 */
function buildSelectionReasons(candidate: any, slotRole: string, recent: any[]): string[] {
  const reasons: string[] = [];
  
  if (slotRole === 'protein_main' && candidate.primary_protein) {
    reasons.push('protein_main');
  } else if (slotRole === 'protein_main' && candidate.dish_type === 'main') {
    reasons.push('protein_main (dish_type)');
  } else if (slotRole === 'veg_side' && !candidate.primary_protein && candidate.dish_type === 'side') {
    reasons.push('veg_side');
  }
  
  if (!hasRecentDuplicate(candidate, recent)) {
    reasons.push('diverse');
  }
  
  return reasons;
}

/**
 * Apply soft budget preference (filter, not block)
 */
function applyBudgetPreference(candidates: any[], budget?: string): any[] {
  if (!budget || budget === 'medium') return candidates;
  
  let preferred: any[] = [];
  
  if (budget === 'budget') {
    // Quick/simple: <=30min OR simple methods
    preferred = candidates.filter(c => 
      (c.total_time_minutes && c.total_time_minutes <= 30) ||
      (c.method && ['stir_fry', 'boiled'].includes(c.method))
    );
  } else if (budget === 'premium') {
    // Premium: >=40min or more involved
    preferred = candidates.filter(c => 
      !c.total_time_minutes || c.total_time_minutes >= 40
    );
  }
  
  // Soft bias: use preferred if available, else fallback to all
  return preferred.length > 0 ? preferred : candidates;
}

export function replaceRecipeInPlan(
  weeklyPlan: Record<string, any[]>,
  dayKey: string,
  index: number,
  availableCandidates: any[],
  options?: { dailyComposition?: string; budget?: string }
): Record<string, any[]> | null {
  const composition = options?.dailyComposition || 'meat_veg';
  const slotRole = getSlotRoleForIndex(composition, index);
  
  const existing = Object.values(weeklyPlan).flat().filter(Boolean);
  
  let candidates = availableCandidates.filter(c => matchesLocalSlotRole(c, slotRole));
  candidates = candidates.filter(c => !weeklyPlan[dayKey]?.some(p => p?.id === c.id));
  
  if (!candidates.length) return null;
  
  // Apply budget preference (soft bias)
  candidates = applyBudgetPreference(candidates, options?.budget);
  
  // Diversity filter
  const recent = getRecentRecipesForDiversity(weeklyPlan, dayKey);
  const diverseCandidates = candidates.filter(c => !hasRecentDuplicate(c, recent));
  const filteredCandidates = diverseCandidates.length > 0 ? diverseCandidates : candidates;
  
  const scored = scoreCandidates(filteredCandidates, existing);
  const selected = scored?.[0]?.recipe;
  
  if (!selected) return null;
  
  const reasons = buildSelectionReasons(selected, slotRole, recent);
  const selectedWithReasons = { ...selected, selectionReasons: reasons };
  
  const dayRecipes = [...(weeklyPlan[dayKey] || [])];
  dayRecipes[index] = selectedWithReasons;
  
  return { ...weeklyPlan, [dayKey]: dayRecipes };
}
