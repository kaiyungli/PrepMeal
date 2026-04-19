import { scoreCandidates } from './recipeScorer';

export function replaceRecipeInPlan(
  weeklyPlan: Record<string, any[]>,
  dayKey: string,
  index: number,
  availableCandidates: any[],
  options?: { dailyComposition?: string; }
): Record<string, any[]> | null {
  const composition = options?.dailyComposition || 'meat_veg';
  const roles = composition === 'meat_veg'
    ? ['protein_main', 'veg_side']
    : composition === 'two_meat_one_veg'
    ? ['protein_main', 'protein_main', 'veg_side']
    : ['any'];
  
  const slotRole = roles[index % roles.length] || 'any';
  
  const existing = Object.values(weeklyPlan).flat().filter(Boolean);
  
  const matchRole = (r: any, sr: string): boolean => {
    if (sr === 'protein_main') return !!r.primary_protein || r.dish_type === 'main';
    if (sr === 'veg_side') return !r.primary_protein && r.dish_type === 'side';
    return true;
  };
  
  let candidates = availableCandidates.filter(c => matchRole(c, slotRole));
  candidates = candidates.filter(c => !weeklyPlan[dayKey]?.some(p => p?.id === c.id));
  
  if (!candidates.length) return null;
  
  const scored = scoreCandidates(candidates, existing);
  if (!scored?.[0]) return null;
  
  return { ...weeklyPlan, [dayKey]: [...(weeklyPlan[dayKey] || [])] };
}
