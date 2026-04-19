import { useCallback } from 'react';
import { COMPOSITION_CONFIG } from '@/constants/composition';

interface UseGenerateHandlersOptions {
  weeklyPlan: any;
  setWeeklyPlan: (plan: any) => void;
  filteredRecipes: any[];
  clearFilters: () => void;
  actionsClearAll: () => void;
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
  // Add random recipe to day - respects composition slot role
  const handleAddRandomRecipe = useCallback((dayKey: string, compositionMode?: string): void => {
    const composition = compositionMode || 'meat_veg';
    const config = COMPOSITION_CONFIG[composition as keyof typeof COMPOSITION_CONFIG] || COMPOSITION_CONFIG.meat_veg;
    const slotRoles = config.slotRoles || ['any'];
    
    // Current day length determines next slot
    const currentCount = weeklyPlan[dayKey]?.length || 0;
    const nextSlotRole = slotRoles[currentCount % slotRoles.length] || 'any';
    
    // Local role filter
    const matchRole = (r: any, sr: string): boolean => {
      if (sr === 'protein_main') return !!r.primary_protein || r.dish_type === 'main';
      if (sr === 'veg_side') return !r.primary_protein && r.dish_type === 'side';
      return true;
    };
    
    let candidates = filteredRecipes.filter((r: any) => matchRole(r, nextSlotRole));
    candidates = candidates.filter((r: any) => !weeklyPlan[dayKey]?.some((pr: any) => pr?.id === r.id));
    
    if (candidates.length === 0) return;
    
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    setWeeklyPlan((prev: Record<string, any[]>) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), random]
    }));
  }, [weeklyPlan, filteredRecipes, setWeeklyPlan]);

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
