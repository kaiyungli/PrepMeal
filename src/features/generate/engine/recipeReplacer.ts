import { scoreCandidates } from './recipeScorer';
import { getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

// Shuffle array helper for randomization
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}


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
function buildSelectionReasons(candidate: any, slotRole: string, recent: any[], budget?: string, weeklyPlan?: Record<string, any[]>): string[] {
  const reasons: string[] = [];
  
  // 1. Slot role
  if (slotRole === 'protein_main' && candidate.primary_protein) {
    reasons.push('protein_main');
  } else if (slotRole === 'protein_main' && candidate.dish_type === 'main') {
    reasons.push('protein_main (dish_type)');
  } else if (slotRole === 'veg_side' && !candidate.primary_protein && candidate.dish_type === 'side') {
    reasons.push('veg_side');
  }
  
  // 2. Diverse (independent)
  if (!hasRecentDuplicate(candidate, recent)) {
    reasons.push('diverse');
  }
  
  // 3. Budget match (independent)
  if (budget === 'budget' && candidate.total_time_minutes && candidate.total_time_minutes <= 30) {
    reasons.push('budget_match');
  } else if (budget === 'budget' && candidate.method && ['stir_fry', 'boiled'].includes(candidate.method)) {
    reasons.push('budget_match');
  } else if (budget === 'premium' && candidate.total_time_minutes && candidate.total_time_minutes >= 40) {
    reasons.push('budget_match');
  }
  
  // 4. Ingredient reuse (independent)
  if (weeklyPlan) {
    const keywords = new Set<string>();
    for (const dayRecipes of Object.values(weeklyPlan)) {
      for (const r of (Array.isArray(dayRecipes) ? dayRecipes : [])) {
        if (r?.name || r?.description) {
          const text = (r.name + ' ' + (r.description || '')).toLowerCase();
          const matches = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
          matches.slice(0, 3).forEach(m => keywords.add(m));
        }
      }
    }
    const candText = ((candidate.name || '') + ' ' + (candidate.description || '')).toLowerCase();
    if ([...keywords].some(k => candText.includes(k))) {
      reasons.push('ingredient_reuse');
    }
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
      c.total_time_minutes && c.total_time_minutes >= 40
    );
  }
  
  // Soft bias: use preferred if available, else fallback to all
  return preferred.length > 0 ? preferred : candidates;
}



// Extract ingredient keywords from existing recipes
function getIngredientKeywords(weeklyPlan: Record<string, any[]>): string[] {
  const allRecipes = Object.values(weeklyPlan).flat().flat().filter(Boolean);
  const keywords: string[] = [];
  
  for (const recipe of allRecipes) {
    const text = ((recipe.name || "") + " " + (recipe.description || "")).toLowerCase();
    // Simple Chinese keyword extraction - look for common ingredient patterns
    const matches = text.match(/[一-龥]{2,4}/g) || [];
    keywords.push(...matches.slice(0, 3)); // Keep first 3 keywords per recipe
  }
  
  return [...new Set(keywords)];
}

// Apply ingredient reuse preference (soft bias)
function applyIngredientReusePreference(candidates: any[], weeklyPlan: Record<string, any[]>): any[] {
  const keywords = getIngredientKeywords(weeklyPlan);
  if (keywords.length === 0) return candidates;
  
  const reuseCandidates = candidates.filter(c => {
    const text = ((c.name || "") + " " + (c.description || "")).toLowerCase();
    return keywords.some(k => text.includes(k));
  });
  
  return reuseCandidates.length > 0 ? reuseCandidates : candidates;
}

export function replaceRecipeInPlan(
  weeklyPlan: Record<string, any[]>,
  dayKey: string,
  index: number,
  availableCandidates: any[],
  options?: { dailyComposition?: string; budget?: string; excludeRecipeIds?: string[] }
): Record<string, any[]> | null {
  const composition = options?.dailyComposition || 'meat_veg';
  const slotRole = getSlotRoleForIndex(composition, index);
  
  const existing = Object.values(weeklyPlan).flat().filter(Boolean);
  
  // Get current recipe
  const currentRecipe = weeklyPlan[dayKey]?.[index];
  
  // Get all used recipe IDs from entire weekly plan
  const usedRecipeIds = new Set(
    Object.values(weeklyPlan)
      .flat()
      .filter(Boolean)
      .map((r: any) => r.id)
  );
  
  // Keep current in used set to exclude it from self-replacement
  // (only if we want to prevent same recipe immediately)
  
  // Filter out candidates already used in weekly plan (but allow current)
  const unusedCandidates = availableCandidates.filter(
    (c: any) => c?.id && c.id !== currentRecipe?.id && !usedRecipeIds.has(c.id)
  );
  
  // Get history IDs to exclude recent selections for this slot
  const historyIds = new Set(options?.excludeRecipeIds || []);
  
  // Priority A: exact role + unused + not history
  let candidates = unusedCandidates.filter(
    (c: any) => matchesLocalSlotRole(c, slotRole) && !historyIds.has(c.id)
  );
  
  // Priority B: exact role + not current + not history
  if (!candidates.length) {
    candidates = availableCandidates.filter(
      (c: any) => c.id !== currentRecipe?.id && matchesLocalSlotRole(c, slotRole) && !historyIds.has(c.id)
    );
  }
  
  // Priority C: unused + not history
  if (!candidates.length) {
    candidates = unusedCandidates.filter((c: any) => !historyIds.has(c.id));
  }
  
  // Priority D: any non-current + not history  
  if (!candidates.length) {
    candidates = availableCandidates.filter(
      (c: any) => c.id !== currentRecipe?.id && !historyIds.has(c.id)
    );
  }
  
  // Priority E: exact role + unused
  if (!candidates.length) {
    candidates = unusedCandidates.filter(
      (c: any) => matchesLocalSlotRole(c, slotRole)
    );
  }
  
  // Priority F: any non-current
  if (!candidates.length) {
    candidates = availableCandidates.filter(
      (c: any) => c.id !== currentRecipe?.id
    );
  }
  
  if (!candidates.length) {
    console.warn('[generate] replace failed: no candidates', {
      dayKey,
      index,
      slotRole,
      availableCount: availableCandidates.length,
      currentRecipeId: currentRecipe?.id,
    });
    return null;
  }
  
  // Apply budget preference (soft bias)
  candidates = applyBudgetPreference(candidates, options?.budget);
  
  // Diversity filter
  const recent = getRecentRecipesForDiversity(weeklyPlan, dayKey);
  const diverseCandidates = candidates.filter(c => !hasRecentDuplicate(c, recent));
  const filteredCandidates = diverseCandidates.length > 0 ? diverseCandidates : candidates;
  
  // Ingredient reuse preference
  const reuseCandidates = applyIngredientReusePreference(filteredCandidates, weeklyPlan);
  const finalCandidates = reuseCandidates.length > 0 ? reuseCandidates : filteredCandidates;
  
  const scored = scoreCandidates(shuffle(finalCandidates), existing);
  // Pick randomly from a wider pool to create visible variety
  const topCandidates = scored.slice(0, Math.min(15, scored.length));
  const selected =
    topCandidates[Math.floor(Math.random() * topCandidates.length)]?.recipe;
  
  if (!selected) return null;
  
  const reasons = buildSelectionReasons(selected, slotRole, recent, options?.budget, weeklyPlan);
  const selectedWithReasons = { ...selected, selectionReasons: reasons };
  
  const dayRecipes = [...(weeklyPlan[dayKey] || [])];
  dayRecipes[index] = selectedWithReasons;
  
  return { ...weeklyPlan, [dayKey]: dayRecipes };
}
