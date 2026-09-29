import { useState, useEffect, useCallback } from 'react';
import { type PlanDay, type Recipe } from '@/services/weeklyPlan';
import { getOrCreateWeeklyPlan, refreshWeeklyPlan } from '@/features/home/homeWeeklyPlanCache';
import { useShoppingListPreview } from '@/hooks/useShoppingListPreview';
import { useUserState } from '@/hooks/useUserState';

interface UseHomePageControllerOptions {
  planRecipes: Recipe[];
  showToast?: (message: string, type?: string) => void;
}

export function useHomePageController({ planRecipes = [], showToast }: UseHomePageControllerOptions) {
  // Weekly plan state
  const [weeklyPlan, setWeeklyPlan] = useState<PlanDay[]>([]);

  // The hero plan is independent of the filtered/paginated recipe results.
  // Generate it after mount so server and client render the same initial
  // markup, and reuse the module-lifetime cache so navigating away and back
  // to "/" (a client-side remount, not a reload) shows the same plan - see
  // homeWeeklyPlanCache.ts for what "module-lifetime" means and why.
  useEffect(() => {
    if (!planRecipes || planRecipes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWeeklyPlan([]);
    } else {
      setWeeklyPlan(getOrCreateWeeklyPlan(planRecipes));
    }
  }, [planRecipes]);

  // Refresh plan handler - always bypasses the cache and generates a new plan.
  const handleRefreshPlan = useCallback(() => {
    setWeeklyPlan(refreshWeeklyPlan(planRecipes));
  }, [planRecipes]);

  // User state for favorites - load immediately (AuthContext is now shared singleton)
  const { isAuthenticated, isFavorite, toggleFavorite } = useUserState({ skipFavorites: false });

  // Favorite toggle handler with auth check
  const handleFavoriteToggle = useCallback((recipeId: string) => {
    if (!toggleFavorite) return; // Favorites disabled
    if (!isAuthenticated) {
      if (showToast) showToast('請先登入以收藏食譜', 'info');
      return;
    }
    toggleFavorite(recipeId);
  }, [isAuthenticated, toggleFavorite, showToast]);

  // Shopping list preview - disabled on homepage (fetch lazily on user interaction)
  const { previewList: shoppingList, isLoading: shoppingLoading, error: shoppingError, isAuthRequired, refresh: refreshShoppingList } = useShoppingListPreview(weeklyPlan, { enabled: false });

  return {
    weeklyPlan,
    handleRefreshPlan,
    isFavorite,
    handleFavoriteToggle,
    shoppingList,
    shoppingLoading,
    shoppingError,
    isAuthRequired,
    refreshShoppingList
  };
}
