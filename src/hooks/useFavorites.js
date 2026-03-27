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
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  
  if (!res.ok) {
    throw new Error('Failed to load favorites');
  }
  
  const data = await res.json();
  const favoritesData = data?.data?.favorites || data?.favorites || [];
  return favoritesData.map(id => normalizeId(id));
};

export function useFavorites() {
  const tokenRef = useRef(null);
  
  // SWR for canonical favorite IDs
  // Key is null when no token - SWR won't fetch
  const { data: favorites = [], error, isLoading, isValidating } = useSWR(
    tokenRef.current ? ['/api/user/favorites', tokenRef.current] : null,
    favoritesFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Helper to set token for SWR key
  const setToken = useCallback((token) => {
    tokenRef.current = token;
  }, []);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Check if a recipe is favorite
  const isFavorite = useCallback((recipeId) => {
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  // Toggle favorite with SWR optimistic update
  const toggleFavorite = useCallback(async (recipeId, token) => {
    if (!token || !recipeId) return false;

    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);
    
    // Optimistic update via mutate
    const previousFavorites = [...favorites];
    
    const newFavorites = isFav
      ? favorites.filter(id => id !== normalizedId)
      : [...favorites, normalizedId];
    
    // Mutate SWR cache optimistically
    mutate(
      ['/api/user/favorites', token],
      newFavorites,
      false // don't revalidate immediately
    );

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
        return true;
      }
      
      // Rollback on failure
      mutate(
        ['/api/user/favorites', token],
        previousFavorites,
        false
      );
      return false;
    } catch (err) {
      // Rollback on error
      mutate(
        ['/api/user/favorites', token],
        previousFavorites,
        false
      );
      return false;
    }
  }, [favoriteSet, favorites]);

  // Keep loadFavorites for backward compat - triggers SWR revalidation
  const loadFavorites = useCallback(async (token) => {
    if (!token) return;
    tokenRef.current = token;
    await mutate(['/api/user/favorites', token]);
  }, []);

  return {
    favorites,
    loading: isLoading,
    validating: isValidating,
    error,
    loadFavorites,
    toggleFavorite,
    isFavorite,
    setToken,
  };
}