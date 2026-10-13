/**
 * Shared hook for API-driven filtered recipe results
 * Handles: fetch, debounce, race prevention, loading, error states, pagination prefetch
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRecipesFromAPI } from '@/features/recipes/services/fetchRecipesFromAPI';
import { buildRecipeApiParams, RecipeApiParams } from '@/features/recipes/mappers/buildRecipeApiParams';
import { canStartSpeculativeFetch } from '@/utils/speculativeFetch';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 24;

// Module-level cache (shared across hook instances)
const recipeCache = new Map<string, { data: any[]; timestamp: number; total: number }>();

function getCacheKey(filters: any, searchQuery: string, sortBy: string, limit: number, page: number): string {
  return JSON.stringify({ filters, searchQuery, sortBy, limit, page });
}

export interface UseFilteredRecipesOptions {
  filters: { [key: string]: string[] };
  searchQuery: string;
  sortBy?: string;
  limit?: number;
  initialTotalCount?: number;
  enabled?: boolean;
}

export interface UseFilteredRecipesResult {
  recipes: any[];
  totalCount: number;
  loading: boolean;
  fetchError: string;
  loadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  isListSettled: () => boolean;
}

export function useFilteredRecipes(
  initialRecipes: any[],
  options: UseFilteredRecipesOptions
): UseFilteredRecipesResult {
  const { filters, searchQuery, sortBy = 'newest', enabled = true } = options;
  
  const [recipes, setRecipes] = useState(initialRecipes || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [totalCount, setTotalCount] = useState(options.initialTotalCount ?? initialRecipes?.length ?? 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState((initialRecipes?.length || 0) < (options.initialTotalCount ?? initialRecipes?.length ?? 0));
  
  const fetchIdRef = useRef(0);
  const hasSkippedInitialFetchRef = useRef(false);
  const listSettledRef = useRef(false);
  const isListSettled = useCallback(() => listSettledRef.current, []);
  
  // Page cache for prefetching
  const pageCacheRef = useRef(new Map<number, { recipes: any[]; total: number }>());
  const prefetchingPagesRef = useRef(new Map<number, Promise<Awaited<ReturnType<typeof fetchRecipesFromAPI>>>>());
  const generationRef = useRef(0);
  const activeRef = useRef(false);
  const scopeRef = useRef('');
  const loadMoreLockRef = useRef<object | null>(null);
  const queryKey = getCacheKey(filters, searchQuery, sortBy, PAGE_SIZE, 0);
  const retireSession = useCallback(() => { activeRef.current = false; generationRef.current++; }, []);
  const retireInitialFetch = useCallback(() => { fetchIdRef.current++; }, []);

  useEffect(() => {
    activeRef.current = enabled; scopeRef.current = queryKey; generationRef.current++;
    listSettledRef.current = false; loadMoreLockRef.current = null;
    pageCacheRef.current.clear(); prefetchingPagesRef.current.clear();
    return retireSession;
  }, [queryKey, enabled, retireSession]);
  
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
    if (!enabled || !activeRef.current || scopeRef.current !== queryKey || !listSettledRef.current || loadMoreLockRef.current) return;
    if (!canStartSpeculativeFetch()) return;
    if (!hasMore) return;
    if (pageCacheRef.current.has(page)) return;
    if (prefetchingPagesRef.current.has(page)) return;
    
    const generation = generationRef.current;
    const current = () => activeRef.current && generationRef.current === generation && scopeRef.current === queryKey;
    
    const start = Date.now();
    console.log('[recipes-client] prefetch_page_start', {
      page,
      currentCount: recipes.length,
      totalCount
    });
    
    const pending = fetchRecipesFromAPI({
      ...buildRecipeApiParams({ filters, searchQuery, sortBy, limit: PAGE_SIZE }),
      limit: PAGE_SIZE,
      page,
    })
      .then(({ recipes: prefetchedRecipes, total }) => {
        if (!current()) return { recipes: prefetchedRecipes, total };
        pageCacheRef.current.set(page, { recipes: prefetchedRecipes, total });
        
        console.log('[recipes-client] prefetch_page_done', {
          duration_ms: Date.now() - start,
          page,
          count: prefetchedRecipes.length,
          total
        });
        return { recipes: prefetchedRecipes, total };
      })
      .finally(() => {
        if (prefetchingPagesRef.current.get(page) === pending) prefetchingPagesRef.current.delete(page);
      });
    prefetchingPagesRef.current.set(page, pending);
    void pending.catch(err => {
      if (current()) console.error('[recipes-client] prefetch_page_failed', { page, error: String(err) });
    });
  }, [enabled, hasMore, filters, searchQuery, sortBy, recipes.length, totalCount, queryKey]);

  // One owned timer preloads the next page after the current list settles.
  useEffect(() => {
    if (!enabled) return;
    if (!hasMore || loading || loadingMore) return;
    if (recipes.length === 0) return;
    
    const timer = setTimeout(() => {
      prefetchPage(currentPage + 1);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [enabled, recipes.length, currentPage, hasMore, loading, loadingMore, prefetchPage]);
  
  // Foreground pagination joins a pending preload rather than issuing another GET.
  const loadMore = useCallback(() => {
    if (!enabled || !activeRef.current || scopeRef.current !== queryKey || !listSettledRef.current ||
        loadMoreLockRef.current || loadingMore || !hasMore || loading) return;
    const generation = generationRef.current;
    const current = () => activeRef.current && generationRef.current === generation && scopeRef.current === queryKey;
    const lock = {}; loadMoreLockRef.current = lock;
    const nextPage = currentPage + 1;
    const cached = pageCacheRef.current.get(nextPage);
    setLoadingMore(true);
    const pending = cached ? Promise.resolve(cached) : prefetchingPagesRef.current.get(nextPage) || fetchRecipesFromAPI({
      ...buildRecipeApiParams({ filters, searchQuery, sortBy, limit: PAGE_SIZE }), limit: PAGE_SIZE, page: nextPage,
    });
    void pending.then(({ recipes: newRecipes, total }) => {
      if (!current()) return;
      setRecipes(prev => {
        if (!current()) return prev;
        const ids = new Set(prev.map((r: any) => r.id));
        const merged = [...prev, ...newRecipes.filter((r: any) => !ids.has(r.id))];
        setHasMore(merged.length < total);
        return merged;
      });
      setTotalCount(total); setCurrentPage(nextPage); pageCacheRef.current.delete(nextPage);
    }).catch(err => {
      if (current()) console.error('[useFilteredRecipes] loadMore error:', err);
    }).finally(() => {
      if (current() && loadMoreLockRef.current === lock) {
        loadMoreLockRef.current = null; setLoadingMore(false);
      }
    });
  }, [enabled, queryKey, currentPage, hasMore, loadingMore, loading, filters, searchQuery, sortBy]);

  // Initial fetch effect with cache
  useEffect(() => {
    if (!enabled) return;
    setLoadingMore(false);
    if (shouldSkipInitialFetch) {
      listSettledRef.current = true;
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
    listSettledRef.current = false;
    const cacheKey = getCacheKey(filters, searchQuery, sortBy, PAGE_SIZE, 1);
    const now = Date.now();
    
    // Check cache first
    const cached = recipeCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      if (!activeRef.current || scopeRef.current !== queryKey || currentId !== fetchIdRef.current) return;
      console.log('[recipes-client] cache_hit', {
        page: 1,
        count: cached.data.length,
        total: cached.total
      });
      listSettledRef.current = true;
      setRecipes(cached.data);
      setTotalCount(cached.total);
      setHasMore(cached.data.length < cached.total);
      setFetchError('');
      setLoading(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      if (!activeRef.current || scopeRef.current !== queryKey || currentId !== fetchIdRef.current) return;
      
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
        
        if (!activeRef.current || scopeRef.current !== queryKey || currentId !== fetchIdRef.current) return;
        
        listSettledRef.current = true;
        setRecipes(fetched);
        setTotalCount(total);
        setHasMore(fetched.length < total);
        setCurrentPage(1);
        setFetchError('');
        recipeCache.set(cacheKey, { data: fetched, timestamp: Date.now(), total });
        
      } catch (err) {
        console.error('[useFilteredRecipes] API error:', err);
        if (!activeRef.current || scopeRef.current !== queryKey || currentId !== fetchIdRef.current) return;
        listSettledRef.current = true;
        setFetchError('暫時無法載入食譜，請稍後再試');
        setRecipes([]);
      } finally {
        if (activeRef.current && scopeRef.current === queryKey && currentId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);
    
    return () => { clearTimeout(timer); retireInitialFetch(); };
  }, [enabled, searchQuery, sortBy, JSON.stringify(filters), queryKey, retireInitialFetch]);
  
  // Reset on filter change
  useEffect(() => {
    if (!enabled) return;
    setCurrentPage(1);
    if (!listSettledRef.current) setHasMore(false);
  }, [enabled, queryKey]);
  
  return { recipes, totalCount, loading, fetchError, loadMore, hasMore, loadingMore, isListSettled };
}
