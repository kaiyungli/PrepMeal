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
import type { GenerateNotify } from './useGeneratePlan';
import { getVisiblePlan } from '../utils/visiblePlan';

export function useGeneratePageController({
  preferences,
  traceId,
  showToast,
}: {
  preferences: GeneratePreferences;
  traceId?: string;
  // Page toast for empty-slot and failed replace/add feedback
  showToast?: GenerateNotify;
}) {
  // Auth
  const { isAuthenticated, user, getAccessToken } = useAuth();
  
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
    budget: budget || 'normal',
    allowCompleteMeal: allowCompleteMeal,
    pantryIngredients: data.pantryIngredients,
    traceId,
    notify: showToast,
  });
  
  // What the grid shows; save, shopping list and counts use only this
  const visiblePlan = useMemo(
    () => getVisiblePlan(plan.weeklyPlan, daysPerWeek, effectiveDishesPerDay),
    [plan.weeklyPlan, daysPerWeek, effectiveDishesPerDay]
  );
  
  // Actions hook (called once)
  const actions = useGenerateActions({
    weeklyPlan: visiblePlan,
    pantryIngredients: data.pantryIngredients,
    servings,
    daysPerWeek,
    isAuthenticated,
    userId: user?.id ?? null,
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
    allowCompleteMeal,
    notify: showToast,
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
    Object.values(visiblePlan).some(arr => Array.isArray(arr) && arr.some(Boolean)),
    [visiblePlan]
  );
  
  const hasGenerated = hasRecipes;
  const selectedCount = useMemo(() => 
    Object.values(visiblePlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.filter(Boolean).length : 0), 0),
    [visiblePlan]
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
    shoppingListError: actions.shoppingListError,
    showShoppingList: actions.showShoppingList,
    isShoppingListLoading: actions.isShoppingListLoading,
    saveNotice: actions.saveNotice,
    isSaving: actions.isSaving,
    preloadShoppingList: actions.preloadShoppingList,
    handleOpenShoppingList: actions.handleOpenShoppingList,
    handleCopyShoppingList: actions.handleCopyShoppingList,
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
