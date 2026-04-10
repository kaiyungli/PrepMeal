import { useState, useEffect, useCallback } from 'react';
import { generateWeeklyPlan } from '@/services/weeklyPlan';
import { useShoppingListPreview } from '@/hooks/useShoppingListPreview';

interface UseHomePageControllerOptions {
  recipesList: any[];
}

export function useHomePageController({ recipesList = [] }: UseHomePageControllerOptions) {
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

  // Shopping list preview
  const { previewList: shoppingList, isLoading: shoppingLoading, error: shoppingError } = useShoppingListPreview(weeklyPlan);

  return {
    weeklyPlan,
    handleRefreshPlan,
    shoppingList,
    shoppingLoading,
    shoppingError
  };
}