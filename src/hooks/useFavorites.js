// Favorites hook - manages user favorites
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use Set for O(1) lookups instead of array.includes O(n)
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Normalize ID to string for comparison
  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Load favorites when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setFavorites([]);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        
        if (!token) {
          return;
        }
        
        const res = await fetch('/api/user/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          return;
        }
        
        const data = await res.json();
        // API returns { success: true, data: { favorites: [...] } }
        const favoritesData = data?.data?.favorites || data?.favorites || [];
        if (favoritesData) {
          setFavorites(favoritesData.map(id => normalizeId(id)));
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, user?.id]);

  const refreshFavorites = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    
    const res = await fetch('/api/user/favorites', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) return;
    
    const data = await res.json();
    const favoritesData = data?.data?.favorites || data?.favorites || [];
    const ids = favoritesData.map(id => normalizeId(id));
    setFavorites(ids);
    
  }, [getAccessToken]);

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!isAuthenticated) {
      return false;
    }

    const normalizedId = normalizeId(recipeId);
    const isFav = favoriteSet.has(normalizedId);
    
    // Store previous favorites for rollback
    const prevFavorites = favorites;

    // Optimistic update BEFORE fetch
    setFavorites(prev => isFav 
      ? prev.filter(id => id !== normalizedId) 
      : [...prev, normalizedId]
    );

    try {
      const token = await getAccessToken();
      
      if (!token) {
        // Rollback on no token
        setFavorites(prevFavorites);
        return false;
      }
      
      let res;
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      
      if (isFav) {
        // Remove favorite
        res = await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, {
          method: 'DELETE',
          headers
        });
      } else {
        // Add favorite
        res = await fetch('/api/user/favorites', {
          method: 'POST',
          headers,
          body: JSON.stringify({ recipe_id: normalizedId }),
        });
      }
      
      if (res.ok) {
        // Background refresh without awaiting
        refreshFavorites().catch(() => {});
        return true;
      }
      
      // Rollback on API failure
      setFavorites(prevFavorites);
      return false;
    } catch (err) {
      // Rollback on error
      setFavorites(prevFavorites);
      return false;
    }
  }, [isAuthenticated, favorites, getAccessToken, refreshFavorites, favoriteSet]);

  const isFavorite = useCallback((recipeId) => {
    const normalizedId = normalizeId(recipeId);
    return favoriteSet.has(normalizedId);
  }, [favoriteSet]);

  return {
    favorites,
    loading: loading || authLoading,
    toggleFavorite,
    isFavorite,
    isAuthenticated,
  };
}
