import { useMemo } from 'react';
import { recipeMatchesFilters } from '@/constants/filters';
import { perfNow, perfLog } from '@/utils/perf';

interface UseFilteredRecipesOptions {
  allRecipes: any[];
  exclusions: string[];
  filters: any;
  traceId?: string;
}

export function useFilteredRecipes({ allRecipes, exclusions, filters, traceId }: UseFilteredRecipesOptions) {
  const filteredRecipes = useMemo(() => {
    const start = perfNow();
    
    if (!allRecipes.length) {
      perfLog({
        traceId,
        event: 'generate_filter',
        stage: 'filter_recipes',
        label: 'generate.filter.total',
        start,
        end: perfNow(),
        meta: { inputCount: 0, outputCount: 0, exclusionCount: 0, activeFilterGroups: 0 }
      });
      return [];
    }
    
    // Count active filter groups
    const activeFilterGroups = filters ? Object.values(filters).filter((arr: any) => arr?.length).length : 0;
    
    // Count exclusions
    const exclusionCount = exclusions?.length || 0;
    
    const result = allRecipes.filter((recipe: any) => {
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
    
    const end = perfNow();
    perfLog({
      traceId,
      event: 'generate_filter',
      stage: 'filter_recipes',
      label: 'generate.filter.total',
      start,
      end,
      meta: { 
        inputCount: allRecipes.length, 
        outputCount: result.length,
        exclusionCount,
        activeFilterGroups
      }
    });
    
    return result;
  }, [allRecipes, exclusions, filters]);
  
  return filteredRecipes;
}
