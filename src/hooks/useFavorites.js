// Favorites hook - manages user favorites for /recipes and /favorites pages
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use Set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Normalize ID to string for comparison
  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Load favorites when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setFavorites([]);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) return;

        const res = await fetch('/api/user/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;

        const data = await res.json();
        const favoritesData = data?.data?.favorites || data?.favorites || [];
        setFavorites(favoritesData.map(id => normalizeId(id)));
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, user, getAccessToken]);

  const refreshFavorites = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch('/api/user/favorites', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;

    const data = await res.json();
    const favoritesData = data?.data?.favorites || data?.favorites || [];
    setFavorites(favoritesData.map(id => normalizeId(id)));
  }, [getAccessToken]);

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!isAuthenticated) return false;

    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);

    // Optimistic update
    setFavorites(prev => isFav
      ? prev.filter(id => id !== normalizedId)
      : [...prev, normalizedId]
    );

    try {
      const token = await getAccessToken();
      if (!token) return false;

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const res = isFav
        ? await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, { method: 'DELETE', headers })
        : await fetch('/api/user/favorites', { method: 'POST', headers, body: JSON.stringify({ recipe_id: normalizedId }) });

      if (res.ok) {
        refreshFavorites().catch(() => {});
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, [isAuthenticated, getAccessToken, favoriteSet, refreshFavorites]);

  const isFavorite = useCallback((recipeId) => {
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);

  return {
    favorites,
    loading: loading || authLoading,
    toggleFavorite,
    isFavorite,
    isAuthenticated,
  };
}