import { useCallback } from 'react';

interface UseGenerateHandlersOptions {
  weeklyPlan: any;
  setWeeklyPlan: (plan: any) => void;
  filteredRecipes: any[];
  clearFilters: () => void;
  actionsClearAll: () => void;
  // Semantic action for plan reset (preferred over raw setter)
  handleResetPlan: () => void;
}

export function useGenerateHandlers({
  weeklyPlan,
  setWeeklyPlan,
  filteredRecipes,
  clearFilters,
  actionsClearAll,
  handleResetPlan,
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

  // Clear all - use semantic handleResetPlan instead of raw setters
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
