'use client';

/**
 * Home page recipe filtering orchestration hook
 * Combines useRecipeFilters + useFilteredRecipes
 */

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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
    setFilters,
  } = useRecipeFilters({ initialShowFilters: false });

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
  const hasDraftSelection = hasDraftFilters || Boolean(searchQuery.trim());

  // The "篩選" button badge must reflect what is actually filtering the
  // results right now (applied), never the in-progress draft.
  const appliedFilterCount = Object.values(applied.filters).reduce(
    (sum, values) => sum + values.length,
    0
  );

  // Chips for the "已套用" summary above the results. Labels come from the
  // (static) option lists in recipeFilterSections regardless of their
  // current draft-selected state.
  const appliedFilterChips = recipeFilterSections.flatMap(section =>
    (applied.filters[section.id] || []).map(value => ({
      sectionId: section.id,
      value,
      label: section.options.find(opt => opt.value === value)?.label || value,
    }))
  );
  const appliedSearchQuery = applied.searchQuery;

  // Removing a chip from the applied summary only edits the draft - the
  // same "select first, confirm second" rule as every other control. This
  // must be an unconditional removal, not a toggle: if the user already
  // unchecked this value inside the panel (so the draft no longer has it),
  // clicking the same chip again in the summary must stay a no-op instead
  // of re-adding it.
  const setDraftFilters = setFilters as unknown as Dispatch<SetStateAction<Record<string, string[]>>>;
  const removeDraftFilterValue = (sectionId: string, value: string) => {
    setDraftFilters(prev => {
      const current = prev[sectionId] || [];
      if (!current.includes(value)) return prev;
      return { ...prev, [sectionId]: current.filter(v => v !== value) };
    });
  };
  const removeDraftSearch = () => setSearchQuery('');

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
    hasDraftSelection,
    hasPendingChanges,
    applyFilters,
    activeFilterCount,
    appliedFilterCount,
    appliedFilterChips,
    appliedSearchQuery,
    removeDraftFilterValue,
    removeDraftSearch,
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
