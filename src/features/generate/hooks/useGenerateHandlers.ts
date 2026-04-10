import { useCallback } from 'react';

interface UseGenerateHandlersOptions {
  weeklyPlan: any;
  setWeeklyPlan: (plan: any) => void;
  setLockedSlots: (slots: any) => void;
  filteredRecipes: any[];
  clearFilters: () => void;
  actionsClearAll: () => void;
}

export function useGenerateHandlers({
  weeklyPlan,
  setWeeklyPlan,
  setLockedSlots,
  filteredRecipes,
  clearFilters,
  actionsClearAll,
}: UseGenerateHandlersOptions) {
  // Add random recipe to day
  const handleAddRandomRecipe = useCallback((dayKey: string): void => {
    const available = filteredRecipes.filter((r: any) => !weeklyPlan[dayKey]?.some((pr: any) => pr?.id === r.id));
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      setWeeklyPlan((prev: Record<string, any[]>) => ({
        ...prev,
        [dayKey]: [...(prev[dayKey] || []), random]
      }));
    }
  }, [weeklyPlan, filteredRecipes, setWeeklyPlan]);

  // Remove recipe from day
  const removeRecipe = useCallback((dayKey: string, index: number): void => {
    setWeeklyPlan((prev: Record<string, any[]>) => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes.splice(index, 1);
      return { ...prev, [dayKey]: dayRecipes };
    });
  }, [setWeeklyPlan]);

  // Clear all - reset plan + clear filters
  const handleClearAll = useCallback((): void => {
    actionsClearAll();
    setWeeklyPlan({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    setLockedSlots({});
    clearFilters();
  }, [actionsClearAll, setWeeklyPlan, setLockedSlots, clearFilters]);

  return {
    handleAddRandomRecipe,
    removeRecipe,
    handleClearAll,
  };
}