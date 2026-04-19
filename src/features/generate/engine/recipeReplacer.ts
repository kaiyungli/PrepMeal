import { scoreCandidates } from './recipeScorer';
import { getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

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
  
  const scored = scoreCandidates(candidates, existing);
  const selected = scored?.[0]?.recipe;
  
  if (!selected) return null;
  
  const dayRecipes = [...(weeklyPlan[dayKey] || [])];
  dayRecipes[index] = selected;
  
  return { ...weeklyPlan, [dayKey]: dayRecipes };
}
