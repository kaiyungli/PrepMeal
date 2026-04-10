/**
 * useGeneratePageController - Main orchestration hook for Generate page
 * Composes: useGenerateData + useGeneratePlan + useGenerateActions
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { useGenerateData } from './useGenerateData';
import { useGeneratePlan } from './useGeneratePlan';
import { useGenerateActions } from './useGenerateActions';
import { recipeMatchesFilters } from '@/constants/filters';

export function useGeneratePageController() {
  // Auth
  const { isAuthenticated, getAccessToken } = useAuth();
  
  // Preferences
  const preferences = useGeneratePreferences();
  const {
    daysPerWeek,
    dailyComposition,
    servings,
    exclusions,
    cuisines,
    cookingConstraints,
    budget,
    filters,
    clearFilters,
  } = preferences;
  
  // Data hook
  const data = useGenerateData();
  
  // Compute filtered recipes
  const filteredRecipes = data.allRecipes.filter((recipe: any) => {
    if (exclusions?.length) {
      const proteins = [...(recipe.protein || [])];
      if (recipe.primary_protein) proteins.push(recipe.primary_protein);
      for (const p of proteins) {
        if (p && (exclusions as any).includes(p)) return false;
      }
    }
    if (filters && Object.keys(filters).length > 0) {
      try {
        if (!recipeMatchesFilters(recipe as any, filters as any)) return false;
      } catch (e) {
        // Include on error
      }
    }
    return true;
  });
  
  // Plan hook
  const plan = useGeneratePlan({
    filteredRecipes,
    dailyComposition,
    daysPerWeek,
    effectiveDishesPerDay: preferences.dishesPerDay,
    cuisines,
    exclusions,
    cookingConstraints,
    budget: budget || 'medium',
    pantryIngredients: data.pantryIngredients,
  });
  
  // Actions hook
  const actions = useGenerateActions({
    weeklyPlan: plan.weeklyPlan,
    pantryIngredients: data.pantryIngredients,
    servings,
    daysPerWeek,
    isAuthenticated,
    getAccessToken,
  });
  
  // Has generated state
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Add random recipe handler
  const handleAddRandomRecipe = useCallback((dayKey: string) => {
    const available = filteredRecipes.filter(r => !plan.weeklyPlan[dayKey]?.some(pr => pr?.id === r.id));
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      plan.setWeeklyPlan(prev => ({
        ...prev,
        [dayKey]: [...(prev[dayKey] || []), random]
      }));
    }
  }, [plan.weeklyPlan, filteredRecipes, plan.setWeeklyPlan]);
  
  // Remove recipe handler
  const removeRecipe = useCallback((dayKey: string, index: number) => {
    plan.setWeeklyPlan(prev => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes.splice(index, 1);
      return { ...prev, [dayKey]: dayRecipes };
    });
  }, [plan.setWeeklyPlan]);
  
  // Clear all wrapper
  const handleClearAll = useCallback(() => {
    actions.handleClearAll();
    plan.setWeeklyPlan({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    plan.setLockedSlots({});
    setHasGenerated(false);
    clearFilters();
  }, [actions, plan, clearFilters]);
  
  // Computed values
  const hasRecipes = Object.values(plan.weeklyPlan).some(arr => Array.isArray(arr) && arr.length > 0);
  const selectedCount = Object.values(plan.weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  
  // Set generated when plan is created
  if (hasRecipes && !hasGenerated) {
    setHasGenerated(true);
  }
  
  return {
    // Preferences
    preferences,
    daysPerWeek,
    servings,
    effectiveDishesPerDay: preferences.dishesPerDay,
    
    // Data
    allRecipes: data.allRecipes,
    loadingRecipes: data.loadingRecipes,
    pantryIngredients: data.pantryIngredients,
    filteredRecipes,
    
    // Plan
    weeklyPlan: plan.weeklyPlan,
    setWeeklyPlan: plan.setWeeklyPlan,
    lockedSlots: plan.lockedSlots,
    handleGenerate: plan.handleGenerate,
    handleReplaceRecipe: plan.handleReplaceRecipe,
    lockSlot: plan.lockSlot,
    unlockSlot: plan.unlockSlot,
    
    // Actions
    selectedRecipe: actions.selectedRecipe,
    modalLoading: actions.modalLoading,
    shoppingList: actions.shoppingList,
    showShoppingList: actions.showShoppingList,
    shoppingListLoaded: actions.shoppingListLoaded,
    saveNotice: actions.saveNotice,
    isSaving: actions.isSaving,
    handleOpenShoppingList: actions.handleOpenShoppingList,
    handleSave: actions.handleSave,
    handleRecipeClick: actions.handleRecipeClick,
    handleCloseRecipe: actions.handleCloseRecipe,
    setShowShoppingList: actions.setShowShoppingList,
    
    // Additional
    hasGenerated,
    hasRecipes,
    selectedCount,
    handleAddRandomRecipe,
    handleClearAll,
    removeRecipe,
  };
}