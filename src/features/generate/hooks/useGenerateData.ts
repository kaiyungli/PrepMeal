import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchAvailableRecipes } from '../index';

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
    fetchAvailableRecipes(200)
      .then(recipes => setAllRecipes(recipes))
      .catch(() => {})
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