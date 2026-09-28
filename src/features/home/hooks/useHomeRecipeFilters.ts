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

interface AppliedSelection {
  filters: Record<string, string[]>;
  searchQuery: string;
  sortBy: string;
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
    hasFilters: hasDraftFilters,
    activeFilterCount,
    clearFilters: clearDraftFilters,
    filters,
  } = useRecipeFilters();

  // Editing the controls does not change the results until the user confirms.
  const [applied, setApplied] = useState<AppliedSelection>(() => ({ filters, searchQuery, sortBy }));
  const pendingKey = JSON.stringify({ filters, searchQuery, sortBy });
  const appliedKey = JSON.stringify(applied);
  const hasPendingChanges = pendingKey !== appliedKey;
  const applyFilters = () => setApplied({
    filters: Object.fromEntries(Object.entries(filters).map(([key, values]) => [key, [...values]])),
    searchQuery,
    sortBy,
  });
  const clearFilters = () => {
    clearDraftFilters();
    setSearchQuery('');
  };
  const clearAppliedFilters = () => {
    clearFilters();
    setSortBy(applied.sortBy);
    setApplied({ filters: Object.fromEntries(Object.keys(filters).map(key => [key, []])), searchQuery: '', sortBy: applied.sortBy });
  };
  const hasFilters = Object.values(applied.filters).some(values => values.length > 0);

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
    filters: applied.filters,
    searchQuery: applied.searchQuery,
    sortBy: applied.sortBy,
    limit: 24,
    initialTotalCount,
    enabled: catalog === null,
  });

  const filteredCatalog = useMemo(() => catalog === null ? null :
    filterHomeCatalog(catalog, applied.filters, applied.searchQuery, applied.sortBy),
  [catalog, applied]);
  const filterKey = appliedKey;
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
    hasDraftFilters,
    hasPendingChanges,
    applyFilters,
    activeFilterCount,
    clearFilters,
    clearAppliedFilters,
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
