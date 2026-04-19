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
}: UseGenerateHandlersOptions) {
  const handleAddRandomRecipe = useCallback((dayKey: string): void => {
    const composition = dailyComposition || 'meat_veg';
    const nextSlotRole = getSlotRoleForIndex(composition, weeklyPlan[dayKey]?.length || 0);
    
    let candidates = filteredRecipes.filter((r: any) => matchesLocalSlotRole(r, nextSlotRole));
    candidates = candidates.filter((r: any) => !weeklyPlan[dayKey]?.some((pr: any) => pr?.id === r.id));
    
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
