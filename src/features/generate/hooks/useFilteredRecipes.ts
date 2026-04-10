import { useMemo } from 'react';
import { recipeMatchesFilters } from '@/constants/filters';

interface UseFilteredRecipesOptions {
  allRecipes: any[];
  exclusions: string[];
  filters: any;
}

export function useFilteredRecipes({ allRecipes, exclusions, filters }: UseFilteredRecipesOptions) {
  const filteredRecipes = useMemo(() => {
    if (!allRecipes.length) return [];
    
    return allRecipes.filter((recipe: any) => {
      // Negative filter: exclusions
      if (exclusions?.length) {
        const proteins = [...(recipe.protein || [])];
        if (recipe.primary_protein) proteins.push(recipe.primary_protein);
        for (const p of proteins) {
          if (p && (exclusions as any).includes(p)) return false;
        }
      }
      
      // Positive filter: recipeMatchesFilters
      if (filters && Object.keys(filters).length > 0) {
        try {
          if (!recipeMatchesFilters(recipe as any, filters as any)) return false;
        } catch (e) {
          // Include on error
        }
      }
      
      return true;
    });
  }, [allRecipes, exclusions, filters]);
  
  return filteredRecipes;
}