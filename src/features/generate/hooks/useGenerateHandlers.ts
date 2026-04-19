import { useCallback } from 'react';
import { getSlotRolesForComposition, getSlotRoleForIndex, matchesLocalSlotRole } from '../utils/slotRoleFilter';

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
    const slotRoles = getSlotRolesForComposition(composition);
    
    const currentCount = weeklyPlan[dayKey]?.length || 0;
    const nextSlotRole = slotRoles[currentCount % slotRoles.length] || 'any';
    
    let candidates = filteredRecipes.filter((r: any) => matchesLocalSlotRole(r, nextSlotRole));
    candidates = candidates.filter((r: any) => !weeklyPlan[dayKey]?.some((pr: any) => pr?.id === r.id));
    
    if (candidates.length === 0) return;
    
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
