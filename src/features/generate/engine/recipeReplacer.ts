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
                   compositionKey === 'two_meat_one_veg' ? ['protein_main', 'protein_main', 'veg_side'] :
                   ['any'];
  
  const targetSlotRole = slotRoles[index % slotRoles.length] || 'any';
  
  // Get current recipes for duplicate check
  const allExistingRecipes = Object.values(weeklyPlan).flat().filter(r => r);
  
  // Simple local role filter
  function matchesSlotRoleLocal(recipe: any, slotRole: string): boolean {
    if (slotRole === 'protein_main') {
      return !!recipe.primary_protein || recipe.dish_type === 'main';
    }
    if (slotRole === 'veg_side') {
      return !recipe.primary_protein && recipe.dish_type === 'side';
    }
    return true;
  }
  
  // Filter candidates by slot role
  let candidatesInDay = availableCandidates.filter(c => matchesSlotRoleLocal(c, targetSlotRole));
  
  // Remove same-day duplicates
  candidatesInDay = candidatesInDay.filter(c => !weeklyPlan[dayKey]?.some(pr => pr?.id === c.id));
  
  if (candidatesInDay.length === 0) {
    return null;
  }
  
  // Use scoring (only 2 args)
  const selected = scoreCandidates(candidatesInDay, allExistingRecipes);
  
  if (!selected || !selected[0]) {
    return null;
  }
  
  // Immutable replacement  
  return {
    ...weeklyPlan,
    [dayKey]: [
      ...(weeklyPlan[dayKey] || [])
    ]
  };
}

OFFILE

# Check
grep "import" src/features/generate/engine/recipeReplacer.ts

echo "=== Building ==="
npm run build 2>&1 | tail -3