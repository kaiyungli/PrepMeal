/**
 * Shared hook for API-driven filtered recipe results
 * Handles: fetch, debounce, race prevention, loading, error states
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRecipesFromAPI } from '@/features/recipes/services/fetchRecipesFromAPI';
import { buildRecipeApiParams, RecipeApiParams } from '@/features/recipes/mappers/buildRecipeApiParams';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const recipeCache = new Map<string, { data: any[]; timestamp: number; total: number }>();

function getCacheKey(filters: any, searchQuery: string, sortBy: string, limit: number, page: number): string {
  return JSON.stringify({ filters, searchQuery, sortBy, limit, page });
}

export interface UseFilteredRecipesOptions {
  filters: { [key: string]: string[] };
  searchQuery: string;
  sortBy?: string;
  limit?: number;
}

export interface UseFilteredRecipesResult {
  recipes: any[];
  totalCount: number;
  loading: boolean;
  fetchError: string;
  loadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

const PAGE_SIZE = 24;

export function useFilteredRecipes(
  initialRecipes: any[],
  options: UseFilteredRecipesOptions
): UseFilteredRecipesResult {
  const { filters, searchQuery, sortBy = 'newest' } = options;
  
  const [recipes, setRecipes] = useState(initialRecipes || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [totalCount, setTotalCount] = useState(initialRecipes?.length || 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const fetchIdRef = useRef(0);
  const hasSkippedInitialFetchRef = useRef(false);
  
  // Check if we should skip initial fetch (homepage case)
  const hasNoFilters = !filters || Object.keys(filters).every(k => !filters[k] || filters[k].length === 0);
  const hasNoSearch = !searchQuery || searchQuery.trim() === '';
  const isDefaultSort = sortBy === 'newest';
  const shouldSkipInitialFetch = 
    !hasSkippedInitialFetchRef.current &&
    (initialRecipes?.length > 0) &&
    hasNoFilters &&
    hasNoSearch &&
    isDefaultSort;
  
  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    
    const nextPage = currentPage + 1;
    const cacheKey = getCacheKey(filters, searchQuery, sortBy, PAGE_SIZE, nextPage);
    
    setLoadingMore(true);
    
    fetchRecipesFromAPI({
      ...buildRecipeApiParams({ filters, searchQuery, sortBy, limit: PAGE_SIZE }),
      limit: PAGE_SIZE,
      page: nextPage,
    }).then(({ recipes: newRecipes, total }) => {
      setRecipes(prev => {
        // Dedupe by recipe.id
        const existingIds = new Set(prev.map((r: any) => r.id));
        const uniqueNew = newRecipes.filter((r: any) => !existingIds.has(r.id));
        return [...prev, ...uniqueNew];
      });
      setTotalCount(total);
      setHasMore(recipes.length + newRecipes.length < total);
      setCurrentPage(nextPage);
    }).catch(err => {
      console.error('[useFilteredRecipes] loadMore error:', err);
    }).finally(() => {
      setLoadingMore(false);
    });
  }, [currentPage, hasMore, loadingMore, loading, recipes.length, filters, searchQuery, sortBy]);
  
  // Initial fetch effect with cache
  useEffect(() => {
    // Skip initial fetch when homepage has initialRecipes with no filters/search/sort changes
    if (shouldSkipInitialFetch) {
      hasSkippedInitialFetchRef.current = true;
      return;
    }
    
    const currentId = ++fetchIdRef.current;
    const cacheKey = getCacheKey(filters, searchQuery, sortBy, PAGE_SIZE, 1);
    const now = Date.now();
    
    // Check cache first
    const cached = recipeCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      if (currentId !== fetchIdRef.current) return;
      setRecipes(cached.data);
      setTotalCount(cached.total);
      setHasMore(cached.data.length < cached.total);
      setFetchError('');
      setLoading(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      if (currentId !== fetchIdRef.current) return;
      
      setLoading(true);
      setFetchError('');
      
      try {
        const { recipes: fetched, total } = await fetchRecipesFromAPI({
          ...buildRecipeApiParams({ filters, searchQuery, sortBy, limit: PAGE_SIZE }),
          limit: PAGE_SIZE,
          page: 1,
        });
        
        if (currentId !== fetchIdRef.current) return;
        
        setRecipes(fetched);
        setTotalCount(total);
        setHasMore(fetched.length < total);
        setCurrentPage(1);
        setFetchError('');
        recipeCache.set(cacheKey, { data: fetched, timestamp: Date.now(), total });
      } catch (err) {
        console.error('[useFilteredRecipes] API error:', err);
        if (currentId !== fetchIdRef.current) return;
        setFetchError('暫時無法載入食譜，請稍後再試');
        setRecipes([]);
      } finally {
        if (currentId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy, JSON.stringify(filters)]);
  
  // Reset on filter change
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
  }, [filters, searchQuery, sortBy]);
  
  return { recipes, totalCount, loading, fetchError, loadMore, hasMore, loadingMore };
}
