// Favorites hook - clean state management without auto-fetch
// Exposes explicit methods only - page decides when to call them
import { useState, useCallback, useMemo } from 'react';

// In-memory cache for favorites (persists across component mounts)
let favoritesCache = [];
let favoritesLoaded = false;

export function useFavorites() {
  const [favorites, setFavorites] = useState(favoritesLoaded ? favoritesCache : []);
  const [loading, setLoading] = useState(false);

  // Use Set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Normalize ID to string
  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Load favorites explicitly - called by page when needed
  const loadFavorites = useCallback(async (token) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/user/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      const favoritesData = data?.data?.favorites || data?.favorites || [];
      const ids = favoritesData.map(id => normalizeId(id));
      
      setFavorites(ids);
      favoritesCache = ids;
      favoritesLoaded = true;
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle favorite with explicit token - called by page
  const toggleFavorite = useCallback(async (recipeId, token) => {
    if (!token || !recipeId) return false;

    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);

    // Optimistic update
    setFavorites(prev => {
      const next = isFav
        ? prev.filter(id => id !== normalizedId)
        : [...prev, normalizedId];
      favoritesCache = next;
      return next;
    });

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
      return false;
    } catch (err) {
      return false;
    }
  }, [favoriteSet]);

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