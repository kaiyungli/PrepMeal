// Favorites hook - canonical favorite IDs owned by SWR
import useSWR, { mutate } from 'swr';
import { useCallback, useMemo } from 'react';

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

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Check if a recipe is favorite
  const isFavorite = useCallback((recipeId) => {
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  // Toggle favorite with SWR optimistic update
  const toggleFavorite = useCallback(async (recipeId, authToken) => {
    if (!authToken || !recipeId) return false;

    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);
    
    // Optimistic update via mutate
    const previousFavorites = [...favorites];
    
    const newFavorites = isFav
      ? favorites.filter(id => id !== normalizedId)
      : [...favorites, normalizedId];
    
    // Mutate SWR cache optimistically
    mutate(
      ['/api/user/favorites', authToken],
      newFavorites,
      false
    );

    try {
      const res = isFav
        ? await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` }
          })
        : await fetch('/api/user/favorites', {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe_id: normalizedId })
          });

      if (res.ok) {
        return true;
      }
      
      // Rollback on failure
      mutate(['/api/user/favorites', authToken], previousFavorites, false);
      return false;
    } catch (err) {
      // Rollback on error
      mutate(['/api/user/favorites', authToken], previousFavorites, false);
      return false;
    }
  }, [favoriteSet, favorites]);

  return {
    favorites,
    loading: isLoading,
    validating: isValidating,
    error,
    toggleFavorite,
    isFavorite,
  };
}