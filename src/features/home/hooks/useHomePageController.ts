import { useState, useEffect, useCallback } from 'react';
import { generateWeeklyPlan, type PlanDay, type Recipe } from '@/services/weeklyPlan';
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
  // Generate it after mount so server and client render the same initial markup.
  useEffect(() => {
    // Defer generation until hydration so random plan selection cannot differ
    // between server and client markup.
    if (!planRecipes || planRecipes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWeeklyPlan([]);
    } else {
      setWeeklyPlan(generateWeeklyPlan(planRecipes));
    }
  }, [planRecipes]);

  // Refresh plan handler
  const handleRefreshPlan = useCallback(() => {
    setWeeklyPlan(generateWeeklyPlan(planRecipes));
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
