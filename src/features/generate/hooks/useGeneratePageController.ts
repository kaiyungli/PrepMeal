/**
 * useGeneratePageController - Main orchestration hook for Generate page
 * Composes: useGenerateData + useFilteredRecipes + useGeneratePlan + useGenerateHandlers + useGenerateActions
 */
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { useGenerateData } from './useGenerateData';
import { useFilteredRecipes } from './useFilteredRecipes';
import { useGeneratePlan } from './useGeneratePlan';
import { useGenerateHandlers } from './useGenerateHandlers';
import { useGenerateActions } from './useGenerateActions';

export function useGeneratePageController() {
  // Auth
  const { isAuthenticated, getAccessToken } = useAuth();
  
  // Preferences
  const preferences = useGeneratePreferences();
  const { daysPerWeek, dailyComposition, servings, budget, filters, clearFilters } = preferences;
  
  // Data hook
  const data = useGenerateData();
  
  // Filtered recipes
  const filteredRecipes = useFilteredRecipes({
    allRecipes: data.allRecipes,
    exclusions: preferences.exclusions,
    filters
  });
  
  // Plan hook
  const plan = useGeneratePlan({
    filteredRecipes,
    dailyComposition,
    daysPerWeek,
    effectiveDishesPerDay: preferences.dishesPerDay,
    cuisines: preferences.cuisines,
    exclusions: preferences.exclusions,
    cookingConstraints: preferences.cookingConstraints,
    budget: budget || 'medium',
    pantryIngredients: data.pantryIngredients,
  });
  
  // Actions hook (called once)
  const actions = useGenerateActions({
    weeklyPlan: plan.weeklyPlan,
    pantryIngredients: data.pantryIngredients,
    servings,
    daysPerWeek,
    isAuthenticated,
    getAccessToken,
  });
  
  // Handlers hook (reuses actions)
  const handlers = useGenerateHandlers({
    weeklyPlan: plan.weeklyPlan,
    setWeeklyPlan: plan.setWeeklyPlan,
    filteredRecipes,
    clearFilters,
    actionsClearAll: actions.handleClearAll,
    handleResetPlan: plan.handleResetPlan,
  });
  
  // Derived state (no setState during render)
  const hasRecipes = useMemo(() => 
    Object.values(plan.weeklyPlan).some(arr => Array.isArray(arr) && arr.length > 0),
    [plan.weeklyPlan]
  );
  
  const hasGenerated = hasRecipes;
  const selectedCount = useMemo(() => 
    Object.values(plan.weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
    [plan.weeklyPlan]
  );
  
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
    lockedSlots: plan.lockedSlots,
    handleGenerate: plan.handleGenerate,
    handleReplaceRecipe: plan.handleReplaceRecipe,
    handleResetPlan: plan.handleResetPlan,
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
    handleCloseShoppingList: actions.handleCloseShoppingList,
    handleSave: actions.handleSave,
    handleRecipeClick: actions.handleRecipeClick,
    handleCloseRecipe: actions.handleCloseRecipe,
    
    // Handlers
    handleAddRandomRecipe: handlers.handleAddRandomRecipe,
    removeRecipe: handlers.removeRecipe,
    handleClearAll: handlers.handleClearAll,
    
    // Filter accordion
    isFilterExpanded,
    setIsFilterExpanded,
    handleToggleFilterExpanded,
    
    // Derived
    hasGenerated,
    hasRecipes,
    selectedCount,
  };
}