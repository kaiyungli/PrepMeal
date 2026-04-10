import { useState, useEffect, useCallback } from 'react';
import { generateWeeklyPlan } from '@/services/weeklyPlan';

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

  return {
    weeklyPlan,
    handleRefreshPlan
  };
}