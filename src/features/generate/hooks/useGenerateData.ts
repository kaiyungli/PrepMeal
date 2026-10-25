import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { fetchAvailableRecipes } from '../index';
import { perfNow, perfLog } from '@/utils/perf';

export function useGenerateData() {
  const router = useRouter();
  
  // Recipe state
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retryRecipes = useCallback(() => setAttempt(value => value + 1), []);

  // Pantry state
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  
  // Fetch recipes on mount
  useEffect(() => {
    let active = true;
    setLoadingRecipes(true);
    setRecipesError(null);
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
  
  // Read pantry from URL
  useEffect(() => {
    const { ingredients } = router.query;
    if (ingredients) {
      const parsed = ingredients.toString().split(',').map(i => i.trim()).filter(Boolean);
      setPantryIngredients(parsed);
    }
  }, [router.query]);
  
  return {
    allRecipes,
    loadingRecipes,
    recipesError,
    retryRecipes,
    pantryIngredients
  };
}
