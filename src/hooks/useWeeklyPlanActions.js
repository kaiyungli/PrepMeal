/**
 * Weekly plan actions hook
 * Provides handlers for manipulating weekly meal plan state
 * 
 * @param {Function} setWeeklyPlan - setState for weekly plan (Record<string, Recipe[]>)
 * @param {Function} setLockedSlots - setState for locked slots (Record<string, boolean>)
 * @returns {Object} - { lockSlot, unlockSlot, removeRecipe, clearAll, replaceRecipe }
 */

import { useCallback } from 'react';

/** @type {import('./types').Recipe | import('./types').Recipe[]} */
const any = undefined;

export function useWeeklyPlanActions(
  /** @type {Function} */ setWeeklyPlan, 
  /** @type {Function} */ setLockedSlots
) {
  /**
   * Lock a slot to prevent auto-replacement
   * @param {string} dayKey - day key (mon/tue/wed/etc)
   * @param {number} index - recipe index in that day
   */
  const lockSlot = useCallback((dayKey, index) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: true }));
  }, [setLockedSlots]);

  /**
   * Unlock a slot to allow auto-replacement
   * @param {string} dayKey - day key
   * @param {number} index - recipe index
   */
  const unlockSlot = useCallback((dayKey, index) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: false }));
  }, [setLockedSlots]);

  /**
   * Remove recipe from a day slot
   * @param {string} dayKey - day key
   * @param {number} index - recipe index to remove
   */
  const removeRecipe = useCallback((dayKey, index) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((_, i) => i !== index)
    }));
  }, [setWeeklyPlan]);

  /**
   * Clear all plan and locked slots
   */
  const clearAll = useCallback(() => {
    setWeeklyPlan({});
    setLockedSlots({});
  }, [setWeeklyPlan, setLockedSlots]);

  /**
   * Replace recipe at slot with scored replacement
   * @param {string} dayKey - day key
   * @param {number} index - recipe index to replace
   * @param {Object} currentPlan - current weekly plan
   * @param {Array} allRecipes - available recipes
   * @param {Function} scoreFn - optional scoring function
   */
  const replaceRecipe = useCallback((dayKey, index, currentPlan, allRecipes, scoreFn) => {
    const currentDayRecipes = currentPlan[dayKey] || [];
    const allPlannedRecipes = Object.values(currentPlan).flat().filter(r => r);
    
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
