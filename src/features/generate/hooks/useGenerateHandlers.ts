import { useCallback } from 'react';
import { getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

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

function hasRecentDuplicate(candidate: any, recent: any[]): boolean {
  if (!recent.length) return false;
  
  const recentProteins = recent.map(r => r.primary_protein).filter(Boolean);
  const recentMethods = recent.map(r => r.method).filter(Boolean);
  
  return (
    (candidate.primary_protein && recentProteins.includes(candidate.primary_protein)) ||
    (candidate.method && recentMethods.includes(candidate.method))
  );
}

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

interface UseGenerateHandlersOptions {
  budget?: string;
  weeklyPlan: any;
  setWeeklyPlan: (plan: any) => void;
  filteredRecipes: any[];
  clearFilters: () => void;
  actionsClearAll: () => void;
  handleResetPlan: () => void;
  dailyComposition: string;
}

export function useGenerateHandlers({
  weeklyPlan,
  setWeeklyPlan,
  filteredRecipes,
  clearFilters,
  actionsClearAll,
  handleResetPlan,
  dailyComposition,
  budget,
}: UseGenerateHandlersOptions) {
  
// Apply soft budget preference (filter, not block)
function applyBudgetPreference(candidates: any[], budget?: string): any[] {
  if (!budget || budget === "medium") return candidates;
  
  let preferred: any[] = [];
  
  if (budget === "budget") {
    preferred = candidates.filter(c => 
      (c.total_time_minutes && c.total_time_minutes <= 30) ||
      (c.method && ["stir_fry", "boiled"].includes(c.method))
    );
  } else if (budget === "premium") {
    preferred = candidates.filter(c => 
      c.total_time_minutes && c.total_time_minutes >= 40
    );
  }
  
  return preferred.length > 0 ? preferred : candidates;
}



// Extract ingredient keywords from existing recipes
function getIngredientKeywords(weeklyPlan: Record<string, any[]>): string[] {
  const allRecipes = Object.values(weeklyPlan).flat().flat().filter(Boolean);
  const keywords: string[] = [];
  
  for (const recipe of allRecipes) {
    const text = ((recipe.name || "") + " " + (recipe.description || "")).toLowerCase();
    const matches = text.match(/[一-龥]{2,4}/g) || [];
    keywords.push(...matches.slice(0, 3));
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

const handleAddRandomRecipe = useCallback((dayKey: string): void => {
    const composition = dailyComposition || 'meat_veg';
    const nextSlotRole = getSlotRoleForIndex(composition, weeklyPlan[dayKey]?.length || 0);
    
    let candidates = filteredRecipes.filter((r: any) => matchesLocalSlotRole(r, nextSlotRole));
    candidates = candidates.filter((r: any) => !weeklyPlan[dayKey]?.some((pr: any) => pr?.id === r.id));
    
    // Apply budget preference (soft bias)
    candidates = applyBudgetPreference(candidates, budget);
    
    // Ingredient reuse preference
    candidates = applyIngredientReusePreference(candidates, weeklyPlan);
    
    if (candidates.length === 0) return;
    
    // Diversity filter
    const recent = getRecentRecipesForDiversity(weeklyPlan, dayKey);
    const diverseCandidates = candidates.filter((r: any) => !hasRecentDuplicate(r, recent));
    candidates = diverseCandidates.length > 0 ? diverseCandidates : candidates;
    
    // Select random
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Attach reasons
    const reasons = buildSelectionReasons(random, nextSlotRole, recent);
    const randomWithReasons = { ...random, selectionReasons: reasons };
    
    setWeeklyPlan((prev: Record<string, any[]>) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), randomWithReasons]
    }));
  }, [weeklyPlan, filteredRecipes, setWeeklyPlan, dailyComposition]);

  const removeRecipe = useCallback((dayKey: string, index: number): void => {
    setWeeklyPlan((prev: Record<string, any[]>) => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes.splice(index, 1);
      return { ...prev, [dayKey]: dayRecipes };
    });
  }, [setWeeklyPlan]);

  const handleClearAll = useCallback((): void => {
    actionsClearAll();
    handleResetPlan();
    clearFilters();
  }, [actionsClearAll, handleResetPlan, clearFilters]);

  return {
    handleAddRandomRecipe,
    removeRecipe,
    handleClearAll,
  };
}
