import { useState, useEffect, useCallback } from 'react';
import { generateWeeklyPlan } from '@/services/weeklyPlan';
import { useShoppingListPreview } from '@/hooks/useShoppingListPreview';
import { useUserState } from '@/hooks/useUserState';

interface UseHomePageControllerOptions {
  recipesList: any[];
  showToast?: (message: string, type?: string) => void;
  skipFavorites?: boolean;
}

export function useHomePageController({ recipesList = [], showToast, skipFavorites = true }: UseHomePageControllerOptions) {
  // Weekly plan state
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>([]);

  // Regenerate weekly plan when recipesList changes
  useEffect(() => {
    if (!recipesList || recipesList.length === 0) {
      setWeeklyPlan([]);
    } else {
      setWeeklyPlan(generateWeeklyPlan(recipesList));
    }
  }, [recipesList]);

  // Refresh plan handler
  const handleRefreshPlan = useCallback(() => {
    setWeeklyPlan(generateWeeklyPlan(recipesList));
  }, [recipesList]);

  // User state for favorites
  const { isAuthenticated, isFavorite, toggleFavorite } = useUserState({ skipFavorites });

  // Favorite toggle handler with auth check
  const handleFavoriteToggle = useCallback((recipeId: string) => {
    if (!toggleFavorite) return; // Favorites disabled
    if (!isAuthenticated) {
      if (showToast) showToast('請先登入以收藏食譜', 'info');
      return;
    }
    toggleFavorite(recipeId);
  }, [isAuthenticated, toggleFavorite, showToast]);

  // Shopping list preview
  const { previewList: shoppingList, isLoading: shoppingLoading, error: shoppingError, isAuthRequired } = useShoppingListPreview(weeklyPlan);

  return {
    weeklyPlan,
    handleRefreshPlan,
    isFavorite,
    handleFavoriteToggle,
    shoppingList,
    shoppingLoading,
    shoppingError,
    isAuthRequired
  };
}