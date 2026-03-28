// Favorites hook - single source of truth for favorite IDs
import useSWR, { mutate } from 'swr';
import { useCallback, useMemo, useRef } from 'react';

const normalizeId = (id) => {
  if (id === undefined || id === null) return '';
  return String(id);
};

// Fetcher for SWR - loads favorite IDs from API
const favoritesFetcher = async ([url, token]) => {
  if (!token) return [];
  
  console.log('[fav-perf]', performance.now().toFixed(2), 'initial_favorites_fetch_start');
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const error = new Error(`Failed to load favorites: ${res.status} ${res.statusText}`);
    error.status = res.status;
    throw error;
  }
  
  const data = await res.json();
  const favoritesData = data?.data?.favorites || data?.favorites || [];
  
  console.log('[fav-perf]', performance.now().toFixed(2), 'initial_favorites_fetch_end', favoritesData.length);
  
  return favoritesData.map(id => normalizeId(id));
};

/**
 * useFavorites - single source of truth for favorite IDs
 * @param {string} token - Access token (from page)
 * 
 * Returns:
 * - favorites: string[] - canonical list of favorite recipe IDs
 * - isFavorite(recipeId): boolean - check if recipe is favorite
 * - toggleFavorite(recipeId): Promise<boolean> - add/remove favorite
 * - loading: boolean - initial load in progress
 * - error: any - any fetch error
 * - isPending(recipeId): boolean - whether this recipe is being toggled
 */
export function useFavorites(token) {
  const swrKey = token ? ['/api/user/favorites', token] : null;
  
  // SWR for canonical favorites data
  // Don't retry on auth failures (401/403)
  const { data: favorites = [], error, isLoading } = useSWR(
    swrKey,
    favoritesFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      fallbackData: [],
      shouldRetryOnError: false,
      onErrorRetry: (err, key, config, revalidate, options) => {
        // Don't retry on auth errors
        const status = err?.status;
        if (status === 401 || status === 403) {
          return;
        }
        // Otherwise retry with delay
        setTimeout(() => revalidate(), 5000);
      },
    }
  );

  // Per-recipe pending state to prevent double-clicks
  const pendingRef = useRef(new Set());

  // Derived Set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Check if a specific recipe is favorite - O(1)
  const isFavorite = useCallback((recipeId) => {
    if (!recipeId) return false;
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  // Check if a specific recipe is currently being toggled
  const isPending = useCallback((recipeId) => {
    if (!recipeId) return false;
    return pendingRef.current.has(normalizeId(recipeId));
  }, []);

  // Toggle favorite - optimistic update with rollback
  const toggleFavorite = useCallback(async (recipeId) => {
    const normalizedId = normalizeId(recipeId);
    
    console.log('[fav-perf]', performance.now().toFixed(2), 'toggle_start', normalizedId);
    
    // Guard: no token = can't toggle
    if (!token) {
      return false;
    }
    
    // Guard: already pending = prevent double-click
    if (pendingRef.current.has(normalizedId)) {
      return false;
    }
    
    // Mark as pending
    pendingRef.current.add(normalizedId);
    
    const isFav = favorites.includes(normalizedId);
    const previousFavorites = [...favorites];
    
    console.log('[fav-perf]', performance.now().toFixed(2), 'optimistic_update_applied', isFav ? 'unfavorite' : 'favorite');
    
    // Optimistic update - immediately reflect in UI
    const newFavorites = isFav
      ? favorites.filter(id => id !== normalizedId)
      : [...favorites, normalizedId];
    
    mutate(swrKey, newFavorites, false);

    try {
      console.log('[fav-perf]', performance.now().toFixed(2), 'api_request_start', isFav ? 'DELETE' : 'POST');
      const res = isFav
        ? await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, {
            method: 'DELETE',
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        : await fetch('/api/user/favorites', {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipe_id: normalizedId })
          });

      console.log('[fav-perf]', performance.now().toFixed(2), 'api_response_received', res.status);

      if (res.ok) {
        console.log('[fav-perf]', performance.now().toFixed(2), 'revalidate_finished');
        // Already applied optimistic update - no revalidation needed
        return true;
      }
      
      // API returned error - rollback to previous
      mutate(swrKey, previousFavorites, false);
      return false;
    } catch (err) {
      // Network error - rollback to previous
      mutate(swrKey, previousFavorites, false);
      return false;
    } finally {
      // Always clear pending state
      pendingRef.current.delete(normalizedId);
    }
  }, [token, swrKey, favoriteSet, favorites]);

  return {
    favorites,
    loading: isLoading,
    error,
    isFavorite,
    isPending,
    toggleFavorite,
  };
}