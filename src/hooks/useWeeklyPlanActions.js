// Weekly plan actions hook

import { useCallback } from 'react';

export function useWeeklyPlanActions(setWeeklyPlan, setLockedSlots) {
  // Lock a slot
  const lockSlot = useCallback((dayKey, index) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: true }));
  }, [setLockedSlots]);

  // Unlock a slot
  const unlockSlot = useCallback((dayKey, index) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: false }));
  }, [setLockedSlots]);

  // Remove recipe from slot
  const removeRecipe = useCallback((dayKey, index) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((_, i) => i !== index)
    }));
  }, [setWeeklyPlan]);

  // Clear all slots
  const clearAll = useCallback(() => {
    setWeeklyPlan({});
    setLockedSlots({});
  }, [setWeeklyPlan, setLockedSlots]);

  // Replace recipe at slot with scored replacement
  const replaceRecipe = useCallback((dayKey, index, currentPlan, allRecipes, scoreFn) => {
    const currentDayRecipes = currentPlan[dayKey] || [];
    const allPlannedRecipes = Object.values(currentPlan).flat().filter(r => r);
    
    // Score each available recipe
    const scored = allRecipes
      .filter(r => !currentDayRecipes?.some(pr => pr?.id === r.id))
      .map(r => {
        let score = 5;
        
        // Repeat penalty
        if (allPlannedRecipes.some(pr => pr.id === r.id)) {
          score -= 100;
        }
        
        // Protein diversity
        const protein = r.primary_protein || r.protein?.[0];
        const recentProteins = allPlannedRecipes.slice(-3).map(pr => pr.primary_protein || pr.protein?.[0]).filter(Boolean);
        if (protein && recentProteins.length > 0) {
          if (!recentProteins.includes(protein)) {
            score += 2;
          } else {
            score -= 1;
          }
        }
        
        // Method diversity
        const method = r.method;
        const recentMethods = allPlannedRecipes.slice(-2).map(pr => pr.method).filter(Boolean);
        if (method && recentMethods.length > 0) {
          if (!recentMethods.includes(method)) {
            score += 1;
          } else {
            score -= 1;
          }
        }
        
        return { recipe: r, score };
      });
    
    if (scored.length === 0) return;
    
    // Sort by score and pick highest
    scored.sort((a, b) => b.score - a.score);
    const selected = scored[0]?.recipe;
    
    if (selected) {
      setWeeklyPlan(prev => {
        const dayRecipes = [...(prev[dayKey] || [])];
        dayRecipes[index] = selected;
        return { ...prev, [dayKey]: dayRecipes };
      });
    }
  }, [setWeeklyPlan]);

  return {
    lockSlot,
    unlockSlot,
    removeRecipe,
    clearAll,
    replaceRecipe,
  };
}
