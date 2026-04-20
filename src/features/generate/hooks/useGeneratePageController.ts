/**
 * useGeneratePageController - Main orchestration hook for Generate page
 * Composes: useGenerateData + useFilteredRecipes + useGeneratePlan + useGenerateHandlers + useGenerateActions
 */
import { useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';

type GeneratePreferences = ReturnType<typeof useGeneratePreferences>;

import { useGenerateData } from './useGenerateData';
import { useFilteredRecipes } from './useFilteredRecipes';
import { useGeneratePlan } from './useGeneratePlan';
import { useGenerateHandlers } from './useGenerateHandlers';
import { useGenerateActions } from './useGenerateActions';

export function useGeneratePageController({
  preferences,
  traceId
}: {
  preferences: GeneratePreferences;
  traceId?: string;
}) {
  // Auth
  const { isAuthenticated, getAccessToken } = useAuth();
  
  // Use passed-in preferences
  const { daysPerWeek, dailyComposition, servings, budget, filters, setFilters, clearFilters, allowCompleteMeal } = preferences;
  
  // Calculate effective dishes per day from composition config
  const effectiveDishesPerDay = COMPOSITION_CONFIG[dailyComposition as keyof typeof COMPOSITION_CONFIG]?.dishesPerDay || preferences.dishesPerDay;
  
  // Data hook
  const data = useGenerateData();
  
  // Filtered recipes
  const filteredRecipes = useFilteredRecipes({
    allRecipes: data.allRecipes,
    exclusions: preferences.exclusions,
    filters,
    traceId
  });
  
  // Plan hook
  const plan = useGeneratePlan({
    filteredRecipes,
    dailyComposition,
    daysPerWeek,
    effectiveDishesPerDay,
    cuisines: preferences.cuisines,
    exclusions: preferences.exclusions,
    cookingConstraints: preferences.cookingConstraints,
    budget: budget || 'medium',
    allowCompleteMeal: allowCompleteMeal,
    pantryIngredients: data.pantryIngredients,
    traceId
  });
  
  // Actions hook (called once)
  const actions = useGenerateActions({
    weeklyPlan: plan.weeklyPlan,
    pantryIngredients: data.pantryIngredients,
    servings,
    daysPerWeek,
    isAuthenticated,
    getAccessToken,
    traceId
  });
  
  // Handlers hook (reuses actions)
  const handlers = useGenerateHandlers({
    weeklyPlan: plan.weeklyPlan,
    setWeeklyPlan: plan.setWeeklyPlan,
    filteredRecipes,
    clearFilters,
    actionsClearAll: actions.handleClearAll,
    handleResetPlan: plan.handleResetPlan,
    dailyComposition,
    budget,
  });
  
  // Filter accordion state
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const handleToggleFilterExpanded = useCallback(() => {
    setIsFilterExpanded(function(prev) {
      
      return !prev;
    });
  }, []);
  
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
    effectiveDishesPerDay,
    
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
    handleResetPlan: plan.handleResetPlan,
    lockSlot: plan.lockSlot,
    unlockSlot: plan.unlockSlot,
    
    // Actions
    selectedRecipe: actions.selectedRecipe,
    modalLoading: actions.modalLoading,
    shoppingListView: actions.shoppingListView,
    showShoppingList: actions.showShoppingList,
    isShoppingListLoading: actions.isShoppingListLoading,
    saveNotice: actions.saveNotice,
    isSaving: actions.isSaving,
    preloadShoppingList: actions.preloadShoppingList,
    handleOpenShoppingList: actions.handleOpenShoppingList,
    handleCloseShoppingList: actions.handleCloseShoppingList,
    handleSave: actions.handleSave,
    handleRecipeClick: actions.handleRecipeClick,
    handleCloseRecipe: actions.handleCloseRecipe,
    
    // Handlers
    handleAddRandomRecipe: handlers.handleAddRandomRecipe,
    removeRecipe: handlers.removeRecipe,
    handleClearAll: handlers.handleClearAll,
    
    // Filters
    filters,
    setFilters,
    
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