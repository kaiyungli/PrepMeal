/**
 * Shared hook for API-driven filtered recipe results
 * Handles: fetch, debounce, race prevention, loading, error states, pagination prefetch
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRecipesFromAPI } from '@/features/recipes/services/fetchRecipesFromAPI';
import { buildRecipeApiParams, RecipeApiParams } from '@/features/recipes/mappers/buildRecipeApiParams';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 24;

function getCacheKey(filters: any, searchQuery: string, sortBy: string, limit: number, page: number): string {
  return JSON.stringify({ filters, searchQuery, sortBy, limit, page });
}

export interface UseFilteredRecipesOptions {
  filters: { [key: string]: string[] };
  searchQuery: string;
  sortBy?: string;
  limit?: number;
  initialTotalCount?: number;
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

export function useFilteredRecipes(
  initialRecipes: any[],
  options: UseFilteredRecipesOptions
): UseFilteredRecipesResult {
  const { filters, searchQuery, sortBy = 'newest' } = options;
  
  const [recipes, setRecipes] = useState(initialRecipes || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [totalCount, setTotalCount] = useState(options.initialTotalCount ?? initialRecipes?.length ?? 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState((initialRecipes?.length || 0) < (options.initialTotalCount ?? initialRecipes?.length ?? 0));
  
  const fetchIdRef = useRef(0);
  const hasSkippedInitialFetchRef = useRef(false);
  
  // Page cache for prefetching
  const pageCacheRef = useRef(new Map<number, { recipes: any[]; total: number }>());
  const prefetchingPagesRef = useRef(new Set<number>());
  
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
  
  // Prefetch a page
  const prefetchPage = useCallback((page: number) => {
    if (!hasMore) return;
    if (pageCacheRef.current.has(page)) return;
    if (prefetchingPagesRef.current.has(page)) return;
    
    prefetchingPagesRef.current.add(page);
    
    const start = Date.now();
    console.log('[recipes-client] prefetch_page_start', {
      page,
      currentCount: recipes.length,
      totalCount
    });
    
    fetchRecipesFromAPI({
      ...buildRecipeApiParams({ filters, searchQuery, sortBy, limit: PAGE_SIZE }),
      limit: PAGE_SIZE,
      page,
    })
      .then(({ recipes: prefetchedRecipes, total }) => {
        pageCacheRef.current.set(page, { recipes: prefetchedRecipes, total });
        
        console.log('[recipes-client] prefetch_page_done', {
          duration_ms: Date.now() - start,
          page,
          count: prefetchedRecipes.length,
          total
        });
      })
      .catch((err) => {
        console.error('[recipes-client] prefetch_page_failed', {
          page,
          error: String(err)
        });
      })
      .finally(() => {
        prefetchingPagesRef.current.delete(page);
      });
  }, [hasMore, filters, searchQuery, sortBy, recipes.length, totalCount]);
  
  // Prefetch page 2 after initial data is ready
  useEffect(() => {
    if (!hasMore) return;
    if (recipes.length === 0) return;
    if (shouldSkipInitialFetch && currentPage === 1) return;
    
    const timer = setTimeout(() => {
      prefetchPage(currentPage + 1);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [recipes.length, currentPage, hasMore, shouldSkipInitialFetch, prefetchPage]);
  
  // Clear cache when filters change
  useEffect(() => {
    pageCacheRef.current.clear();
    prefetchingPagesRef.current.clear();
  }, [filters, searchQuery, sortBy]);
  
  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    
    const nextPage = currentPage + 1;
    
    // Check cache first
    const cachedPage = pageCacheRef.current.get(nextPage);
    if (cachedPage) {
      console.log('[recipes-client] load_more_cache_hit', {
        nextPage,
        cachedCount: cachedPage.recipes.length,
        total: cachedPage.total
      });
      
      setLoadingMore(true);
      setRecipes(prev => {
        const existingIds = new Set(prev.map((r: any) => r.id));
        const uniqueNew = cachedPage.recipes.filter((r: any) => !existingIds.has(r.id));
        const merged = [...prev, ...uniqueNew];
        setHasMore(merged.length < cachedPage.total);
        return merged;
      });
      setTotalCount(cachedPage.total);
      setCurrentPage(nextPage);
      pageCacheRef.current.delete(nextPage);
      
      setTimeout(() => prefetchPage(nextPage + 1), 0);
      
      setTimeout(() => setLoadingMore(false), 50);
      return;
    }
    
    // No cache, fetch from API
    const loadMoreStart = Date.now();
    
    console.log('[recipes-client] load_more_start', {
      nextPage,
      currentPage,
      currentCount: recipes.length,
      totalCount,
      hasMore
    });
    
    setLoadingMore(true);
    
    fetchRecipesFromAPI({
      ...buildRecipeApiParams({ filters, searchQuery, sortBy, limit: PAGE_SIZE }),
      limit: PAGE_SIZE,
      page: nextPage,
    }).then(({ recipes: newRecipes, total }) => {
      const fetchDuration = Date.now() - loadMoreStart;
      
      console.log('[recipes-client] load_more_response', {
        duration_ms: fetchDuration,
        nextPage,
        newCount: newRecipes.length,
        total
      });
      
      const mergeStart = Date.now();
      setRecipes(prev => {
        const existingIds = new Set(prev.map((r: any) => r.id));
        const uniqueNew = newRecipes.filter((r: any) => !existingIds.has(r.id));
        const merged = [...prev, ...uniqueNew];
        setHasMore(merged.length < total);
        
        console.log('[recipes-client] load_more_merge_done', {
          duration_ms: Date.now() - mergeStart,
          nextPage,
          uniqueNewCount: uniqueNew.length,
          mergedCount: merged.length,
          total,
          hasMore: merged.length < total
        });
        
        return merged;
      });
      setTotalCount(total);
      setCurrentPage(nextPage);
      
      // Prefetch next page after successful load
      setTimeout(() => prefetchPage(nextPage + 1), 0);
    }).catch(err => {
      console.error('[useFilteredRecipes] loadMore error:', err);
    }).finally(() => {
      setLoadingMore(false);
    });
  }, [currentPage, hasMore, loadingMore, loading, filters, searchQuery, sortBy, recipes.length, totalCount, prefetchPage]);
  
  // Initial fetch effect with cache
  useEffect(() => {
    if (shouldSkipInitialFetch) {
      console.log('[recipes-client] initial_fetch_skipped', {
        initial_count: initialRecipes?.length || 0,
        initialTotalCount: options.initialTotalCount,
        hasNoFilters,
        hasNoSearch,
        isDefaultSort
      });
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
      console.log('[recipes-client] cache_hit', {
        page: 1,
        count: cached.data.length,
        total: cached.total
      });
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
      
      console.log('[recipes-client] fetch_start', {
        page: 1,
        filters,
        search: Boolean(searchQuery?.trim()),
        sortBy
      });
      
      const fetchStart = Date.now();
      
      try {
        const { recipes: fetched, total } = await fetchRecipesFromAPI({
          ...buildRecipeApiParams({ filters, searchQuery, sortBy, limit: PAGE_SIZE }),
          limit: PAGE_SIZE,
          page: 1,
        });
        
        console.log('[recipes-client] fetch_done', {
          duration_ms: Date.now() - fetchStart,
          page: 1,
          count: fetched.length,
          total
        });
        
        if (currentId !== fetchIdRef.current) return;
        
        setRecipes(fetched);
        setTotalCount(total);
        setHasMore(fetched.length < total);
        setCurrentPage(1);
        setFetchError('');
        recipeCache.set(cacheKey, { data: fetched, timestamp: Date.now(), total });
        
        // Prefetch page 2 after initial fetch
        if (fetched.length > 0 && total > fetched.length) {
          setTimeout(() => prefetchPage(2), 500);
        }
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

// Module-level cache (shared across hook instances)
const recipeCache = new Map<string, { data: any[]; timestamp: number; total: number }>();