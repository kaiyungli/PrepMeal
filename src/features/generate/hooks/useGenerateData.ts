import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchAvailableRecipes } from '../index';
import { perfNow, perfLog } from '@/utils/perf';

export function useGenerateData() {
  const router = useRouter();
  
  // Recipe state
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  
  // Pantry state
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  
  // Fetch recipes on mount
  useEffect(() => {
    setLoadingRecipes(true);
    const start = perfNow();
    
    perfLog({
      event: 'generate_data_load',
      stage: 'recipes_fetch_start',
      label: 'generate.mount.recipes_fetch.start',
      start
    });
    
    fetchAvailableRecipes(200)
      .then(recipes => {
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
        const end = perfNow();
        perfLog({
          event: 'generate_data_load',
          stage: 'recipes_fetch_error',
          label: 'generate.mount.recipes_fetch.error',
          start,
          end
        });
      })
      .finally(() => setLoadingRecipes(false));
  }, []);
  
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
    pantryIngredients
  };
}
