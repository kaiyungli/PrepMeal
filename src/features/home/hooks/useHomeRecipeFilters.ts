'use client';

/**
 * Home page recipe filtering orchestration hook
 * Combines useRecipeFilters + useFilteredRecipes
 */

import { useMemo, useState } from 'react';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFilteredRecipes } from '@/features/recipes/hooks/useFilteredRecipes';
import { filterHomeCatalog, PAGE_SIZE, HomeCatalogRecipe } from '@/features/home/filterHomeCatalog';

interface UseHomeRecipeFiltersOptions {
  initialRecipes?: unknown[];
  initialTotalCount?: number;
  catalog?: HomeCatalogRecipe[] | null;
}

export function useHomeRecipeFilters({
  initialRecipes = [],
  initialTotalCount = 0,
  catalog = null,
}: UseHomeRecipeFiltersOptions = {}) {
  const [pagination, setPagination] = useState({ key: '', count: PAGE_SIZE });
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
    recipes: apiRecipes,
    totalCount: apiTotal,
    loading: apiLoading,
    fetchError: apiError,
    loadMore: apiLoadMore,
    hasMore: apiHasMore,
    loadingMore: apiLoadingMore,
  } = useFilteredRecipes(initialRecipes, {
    filters,
    searchQuery,
    sortBy,
    limit: 24,
    initialTotalCount,
    enabled: catalog === null,
  });

  const filteredCatalog = useMemo(() => catalog === null ? null :
    filterHomeCatalog(catalog, filters, searchQuery, sortBy),
  [catalog, filters, searchQuery, sortBy]);
  const filterKey = JSON.stringify({ filters, searchQuery, sortBy });
  const visibleCount = pagination.key === filterKey ? pagination.count : PAGE_SIZE;
  const recipesList = filteredCatalog?.slice(0, visibleCount) ?? apiRecipes;
  const totalCount = filteredCatalog?.length ?? apiTotal;
  const loading = catalog === null && apiLoading;
  const fetchError = catalog === null ? apiError : '';
  const hasMore = filteredCatalog ? visibleCount < filteredCatalog.length : apiHasMore;
  const loadingMore = catalog === null && apiLoadingMore;
  const loadMore = catalog === null ? apiLoadMore : () => setPagination({ key: filterKey, count: visibleCount + PAGE_SIZE });

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
