// Favorites hook - single source of truth scoped to user
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUserRef = useRef(null);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Load favorites - scoped to current user, not cached across users
  const loadFavorites = useCallback(async (token, userId) => {
    if (!token || !userId) return;
    
    // Reset if user changed
    if (currentUserRef.current !== userId) {
      currentUserRef.current = userId;
      setFavorites([]);
    }
    
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
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle with rollback on failure
  const toggleFavorite = useCallback(async (recipeId, token) => {
    if (!token || !recipeId) return false;

    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);
    
    // Store previous state for rollback
    const previousFavorites = [...favorites];

    // Optimistic update
    const newFavorites = isFav
      ? favorites.filter(id => id !== normalizedId)
      : [...favorites, normalizedId];
    
    setFavorites(newFavorites);

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
      setFavorites(previousFavorites);
      return false;
    } catch (err) {
      // Rollback on error
      setFavorites(previousFavorites);
      return false;
    }
  }, [favoriteSet, favorites]);

  const isFavorite = useCallback((recipeId) => {
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  // Reset favorites when user logs out
  useEffect(() => {
    if (!currentUserRef.current) {
      return;
    }
    // This will be handled by the page-level effect when isAuthenticated changes
  }, []);

  return {
    favorites,
    loading,
    loadFavorites,
    toggleFavorite,
    isFavorite,
  };
}