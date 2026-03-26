// Favorites hook - single source of truth for canonical favorites IDs
import { useState, useCallback, useMemo, useRef } from 'react';

// In-memory cache - single source of truth across session
let favoritesCache = [];

export function useFavorites() {
  const [favorites, setFavorites] = useState(favoritesCache);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Load favorites - called by pages that need favorites
  const loadFavorites = useCallback(async (token) => {
    if (!token) return;
    if (favoritesCache.length > 0) {
      setFavorites(favoritesCache);
      return;
    }
    if (loadedRef.current) return;
    
    loadedRef.current = true;
    setLoading(true);
    
    try {
      const res = await fetch('/api/user/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        loadedRef.current = false;
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      const favoritesData = data?.data?.favorites || data?.favorites || [];
      const ids = favoritesData.map(id => normalizeId(id));
      
      setFavorites(ids);
      favoritesCache = ids;
    } catch (err) {
      loadedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle - canonical update in useFavorites, instant for caller
  const toggleFavorite = useCallback(async (recipeId, token) => {
    if (!token || !recipeId) return false;

    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);

    // Optimistic update to cache
    const newFavorites = isFav
      ? favorites.filter(id => id !== normalizedId)
      : [...favorites, normalizedId];
    
    setFavorites(newFavorites);
    favoritesCache = newFavorites;

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

      return res.ok;
    } catch (err) {
      return false;
    }
  }, [favoriteSet, favorites]);

  // Check if recipe is favorite
  const isFavorite = useCallback((recipeId) => {
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  return {
    favorites,
    loading,
    loadFavorites,
    toggleFavorite,
    isFavorite,
  };
}