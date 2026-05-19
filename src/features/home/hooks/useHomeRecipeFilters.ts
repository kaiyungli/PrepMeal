'use client';

/**
 * Home page recipe filtering orchestration hook
 * Combines useRecipeFilters + useFilteredRecipes
 */

import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFilteredRecipes } from '@/features/recipes/hooks/useFilteredRecipes';

interface UseHomeRecipeFiltersOptions {
  initialRecipes?: unknown[];
  initialTotalCount?: number;
}

export function useHomeRecipeFilters({
  initialRecipes = [],
  initialTotalCount = 0,
}: UseHomeRecipeFiltersOptions = {}) {
  // Recipe filter state
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    recipeFilterSections,
    hasFilters,
    activeFilterCount,
    clearFilters,
    filters,
  } = useRecipeFilters();

  // API-driven filtered recipes
  const {
    recipes: recipesList,
    totalCount,
    loading,
    fetchError,
    loadMore,
    hasMore,
    loadingMore,
  } = useFilteredRecipes(initialRecipes, {
    filters,
    searchQuery,
    sortBy,
    limit: 24,
    initialTotalCount,
  });

  return {
    // Filter controls
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    recipeFilterSections,
    hasFilters,
    activeFilterCount,
    clearFilters,
    filters,
    // Recipe data
    recipesList,
    totalCount,
    loading,
    fetchError,
    loadMore,
    hasMore,
    loadingMore,
  };
}

export default useHomeRecipeFilters;
