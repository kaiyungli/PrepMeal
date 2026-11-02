import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { fetchAvailableRecipes } from '../index';
import { perfNow, perfLog } from '@/utils/perf';

export function useGenerateData() {
  const router = useRouter();
  
  // Recipe state
  const [allRecipes, setAllRecipes] = useState<Awaited<ReturnType<typeof fetchAvailableRecipes>>>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retryRecipes = useCallback(() => { setLoadingRecipes(true); setRecipesError(null); setAttempt(value => value + 1); }, []);

  // Pantry state
  const ingredients = router.query.ingredients;
  const pantryIngredients = useMemo(() => ingredients
    ? ingredients.toString().split(',').map(i => i.trim()).filter(Boolean) : [], [ingredients]);
  
  // Fetch recipes on mount
  useEffect(() => {
    let active = true;
    const start = perfNow();
    
    perfLog({
      event: 'generate_data_load',
      stage: 'recipes_fetch_start',
      label: 'generate.mount.recipes_fetch.start',
      start
    });
    
    fetchAvailableRecipes()
      .then(recipes => {
        if (!active) return;
        const end = perfNow();
        setAllRecipes(recipes);
        perfLog({
          event: 'generate_data_load',
          stage: 'recipes_fetch_done',
          label: 'generate.mount.recipes_fetch.done',
          start,
          end,
          meta: { recipeCount: recipes.length }
        });
      })
      .catch(() => {
        if (!active) return;
        setRecipesError('未能載入食譜，請檢查網絡後重試。');
        const end = perfNow();
        perfLog({
          event: 'generate_data_load',
          stage: 'recipes_fetch_error',
          label: 'generate.mount.recipes_fetch.error',
          start,
          end
        });
      })
      .finally(() => { if (active) setLoadingRecipes(false); });
    return () => { active = false; };
  }, [attempt]);
  
  return {
    allRecipes,
    loadingRecipes,
    recipesError,
    retryRecipes,
    pantryIngredients
  };
}
