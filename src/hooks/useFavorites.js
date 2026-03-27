// Favorites hook - canonical favorite IDs owned by SWR
import useSWR, { mutate } from 'swr';
import { useCallback, useMemo, useRef } from 'react';

const normalizeId = (id) => {
  if (id === undefined || id === null) return '';
  return String(id);
};

// Fetcher for SWR - loads favorite IDs from API
const favoritesFetcher = async ([url, token]) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error('Failed to load favorites');
  }
  
  const data = await res.json();
  const favoritesData = data?.data?.favorites || data?.favorites || [];
  return favoritesData.map(id => normalizeId(id));
};

/**
 * useFavorites - SWR-based favorites hook
 * @param {string} token - Access token for authorization (pass from page)
 */
export function useFavorites(token) {
  // SWR key is null when no token - won't fetch
  const swrKey = token ? ['/api/user/favorites', token] : null;
  
  const { data: favorites = [], error, isLoading, isValidating } = useSWR(
    swrKey,
    favoritesFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      fallbackData: [],
    }
  );

  // Pending state to prevent race conditions
  const togglingRef = useRef(false);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Check if a recipe is favorite
  const isFavorite = useCallback((recipeId) => {
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  // Toggle favorite with SWR optimistic update + revalidate after success
  const toggleFavorite = useCallback(async (recipeId) => {
    // Prevent race condition - don't allow multiple simultaneous toggles
    if (togglingRef.current || !token) return false;
    
    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);
    
    // Mark as toggling to prevent race conditions
    togglingRef.current = true;
    
    // Store previous state for rollback
    const previousFavorites = [...favorites];
    
    // Optimistic update - immediately update UI
    const newFavorites = isFav
      ? favorites.filter(id => id !== normalizedId)
      : [...favorites, normalizedId];
    
    mutate(swrKey, newFavorites, false);

    try {
      const res = isFav
        ? await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
        : await fetch('/api/user/favorites', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe_id: normalizedId })
          });

      if (res.ok) {
        // Success - revalidate to sync with server state
        mutate(swrKey);
        togglingRef.current = false;
        return true;
      }
      
      // API failed - rollback to previous state
      mutate(swrKey, previousFavorites, false);
      togglingRef.current = false;
      return false;
    } catch (err) {
      // Error - rollback to previous state
      mutate(swrKey, previousFavorites, false);
      togglingRef.current = false;
      return false;
    }
  }, [token, swrKey, favoriteSet, favorites]);

  return {
    favorites,
    loading: isLoading,
    validating: isValidating,
    error,
    toggleFavorite,
    isFavorite,
  };
}