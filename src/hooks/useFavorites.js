// Favorites hook - manages user favorites
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

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
    const isFav = favorites.includes(normalizedId);

    try {
      const token = await getAccessToken();
      
      if (!token) {
        
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
        // Optimistic update immediately
        setFavorites(prev => isFav ? prev.filter(id => id !== normalizedId) : [...prev, normalizedId]);
        // Background refresh without awaiting
        refreshFavorites().catch(() => {});
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, [isAuthenticated, favorites, getAccessToken, refreshFavorites]);

  const isFavorite = useCallback((recipeId) => {
    const normalizedId = normalizeId(recipeId);
    return favorites.includes(normalizedId);
  }, [favorites]);

  return {
    favorites,
    loading: loading || authLoading,
    toggleFavorite,
    isFavorite,
    isAuthenticated,
  };
}
