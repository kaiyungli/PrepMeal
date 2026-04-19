import { useCallback } from 'react';
import { getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

/**
 * Get recent recipes for diversity (all days except current)
 */
function getRecentRecipesForDiversity(weeklyPlan: Record<string, any[]>, dayKey: string): any[] {
  return Object.entries(weeklyPlan)
    .filter(([day]) => day !== dayKey)
    .flatMap(([, recipes]) => recipes)
    .filter(Boolean);
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
    
    // Simple diversity filter
    const recent = getRecentRecipesForDiversity(weeklyPlan, dayKey);
    const diverseCandidates = candidates.filter((r: any) => !hasRecentDuplicate(r, recent));
    candidates = diverseCandidates.length > 0 ? diverseCandidates : candidates;
    
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    setWeeklyPlan((prev: Record<string, any[]>) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), random]
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
