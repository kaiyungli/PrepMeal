/**
 * Derived homepage view state hook
 * Pure derived values - no side effects, no fetch, no router logic
 */

interface UseHomePageViewStateParams {
  loading: boolean;
  fetchError?: string | null;
  recipesList: unknown[];
  totalCount: number;
  hasFilters: boolean;
  searchQuery?: string;
}

interface HomePageViewState {
  hasSearchOrFilters: boolean;
  showErrorState: boolean;
  showEmptyState: boolean;
  showResults: boolean;
  resultCountText: string;
}

/**
 * Derived home page view state
 * @param loading - is the recipes list loading
 * @param fetchError - error string or empty (falsy when no error)
 * @param recipesList - array of recipe objects
 * @param totalCount - total number of recipes
 * @param hasFilters - are any filters active
 * @param searchQuery - current search query string
 */
export function useHomePageViewState({
  loading,
  fetchError,
  recipesList,
  totalCount,
  hasFilters,
  searchQuery,
}: UseHomePageViewStateParams): HomePageViewState {
  // Has any search or filter active
  const hasSearchOrFilters = hasFilters || Boolean(searchQuery?.trim());
  
  // Show error state when not loading and there's an error (truthy string)
  const showErrorState = !loading && Boolean(fetchError);
  
  // Show empty state (no results, no error, not loading)
  const showEmptyState = !loading && !fetchError && recipesList.length === 0;
  
  // Show results grid
  const showResults = !loading && !fetchError && recipesList.length > 0;
  
  // Result count text
  const resultCountText = totalCount > 0 ? `共 ${totalCount} 個食譜` : '';
  
  return {
    hasSearchOrFilters,
    showErrorState,
    showEmptyState,
    showResults,
    resultCountText,
  };
}

export default useHomePageViewState;
