// Favorites hook - canonical favorite IDs owned by SWR with per-recipe locking
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
 * useFavorites - SWR-based favorites hook with per-recipe locking
 * @param {string} token - Access token for authorization (pass from page)
 * 
 * IMPORTANT: toggleFavorite always returns Promise<boolean>
 */
export function useFavorites(token) {
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

  const togglingMapRef = useRef({});
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const isFavorite = useCallback((recipeId) => {
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  // toggleFavorite always returns Promise<boolean>
  const toggleFavorite = useCallback(async (recipeId) => {
    const normalizedId = normalizeId(recipeId);
    
    if (!token) {
      return false;
    }
    
    // Per-recipe lock
    if (togglingMapRef.current[normalizedId]) {
      return false;
    }
    
    togglingMapRef.current[normalizedId] = true;
    
    try {
      const isFav = favoriteSet.has(normalizedId);
      const previousFavorites = [...favorites];
      
      // Optimistic update
      const newFavorites = isFav
        ? favorites.filter(id => id !== normalizedId)
        : [...favorites, normalizedId];
      
      mutate(swrKey, newFavorites, false);

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
        mutate(swrKey);
        return true;
      }
      
      // Rollback on failure
      mutate(swrKey, previousFavorites, false);
      return false;
    } catch (err) {
      // Rollback on error
      mutate(swrKey, favorites, false);
      return false;
    } finally {
      delete togglingMapRef.current[normalizedId];
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