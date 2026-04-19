/**
 * Shared hook for API-driven filtered recipe results
 * Handles: fetch, debounce, race prevention, loading, error states
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRecipesFromAPI } from '@/features/recipes/services/fetchRecipesFromAPI';
import { buildRecipeApiParams, RecipeApiParams } from '@/features/recipes/mappers/buildRecipeApiParams';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const recipeCache = new Map<string, { data: any[]; timestamp: number }>();

function getCacheKey(filters: any, searchQuery: string, sortBy: string, limit: number): string {
  return JSON.stringify({ filters, searchQuery, sortBy, limit });
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
}

export function useFilteredRecipes(
  initialRecipes: any[],
  options: UseFilteredRecipesOptions
): UseFilteredRecipesResult {
  const { filters, searchQuery, sortBy = 'newest', limit = 100 } = options;
  
  const [recipes, setRecipes] = useState(initialRecipes || []);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const totalCount = recipes.length; // Use array length for count
  
  const fetchIdRef = useRef(0);
  
  // Debounced fetch effect with cache
    useEffect(() => {
    const currentId = ++fetchIdRef.current;
    const cacheKey = getCacheKey(filters, searchQuery, sortBy, limit);
    const now = Date.now();
    
    // Check cache first
    const cached = recipeCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      // Cache hit - use cached data (with race check)
      if (currentId !== fetchIdRef.current) return;
      setRecipes(cached.data);
      setFetchError('');
      setLoading(false);
      return; // Skip API call
    }
    
    const timer = setTimeout(async () => {
      // Race condition: this request is stale
      if (currentId !== fetchIdRef.current) return;
      
      setLoading(true);
      setFetchError('');
      
      try {
      const fetchParams = buildRecipeApiParams({
          filters,
          searchQuery,
          sortBy,
          limit,
        });
        
        const fetched = await fetchRecipesFromAPI(fetchParams);
        
        // Race condition: another request started
        if (currentId !== fetchIdRef.current) return;
        
        // Success path: use API result (not initialRecipes fallback)
        // Cache ALL successful responses (including empty arrays)
        setRecipes(fetched);
        setFetchError('');
        recipeCache.set(cacheKey, { data: fetched, timestamp: Date.now() });
      } catch (err) {
        // Error path: explicit error, NOT fallback to initialRecipes
        console.error('[useFilteredRecipes] API error:', err);
        if (currentId !== fetchIdRef.current) return;
        setFetchError('暫時無法載入食譜，請稍後再試');
        setRecipes([]);
      } finally {
        if (currentId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    }, 300); // Debounce 300ms
    
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy, JSON.stringify(filters), limit]);
  
  return { recipes, totalCount, loading, fetchError };
}
