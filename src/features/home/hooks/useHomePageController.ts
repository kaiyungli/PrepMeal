import { useState, useEffect, useCallback } from 'react';
import { generateWeeklyPlan } from '@/services/weeklyPlan';
import { useShoppingListPreview } from '@/hooks/useShoppingListPreview';
import { useUserState } from '@/hooks/useUserState';
import { useToast } from '@/components/ui/Toast';

interface UseHomePageControllerOptions {
  recipesList: any[];
}

export function useHomePageController({ recipesList = [] }: UseHomePageControllerOptions) {
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
  const { isAuthenticated, isFavorite, toggleFavorite } = useUserState();
  const { showToast } = useToast();

  // Favorite toggle handler with auth check
  const handleFavoriteToggle = useCallback((recipeId: string) => {
    if (!isAuthenticated) {
      showToast('請先登入以收藏食譜', 'info');
      return;
    }
    console.log('[fav-perf]', performance.now().toFixed(2), 'button_click', recipeId);
    toggleFavorite(recipeId);
  }, [isAuthenticated, toggleFavorite, showToast]);

  // Shopping list preview
  const { previewList: shoppingList, isLoading: shoppingLoading, error: shoppingError } = useShoppingListPreview(weeklyPlan);

  return {
    weeklyPlan,
    handleRefreshPlan,
    isFavorite,
    handleFavoriteToggle,
    shoppingList,
    shoppingLoading,
    shoppingError
  };
}