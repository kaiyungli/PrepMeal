// Favorites hook - manages user favorites
// Designed to not block initial page render
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Use Set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Normalize ID to string for comparison
  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Load favorites after a delay - don't block initial page paint
  useEffect(() => {
    if (!isAuthenticated || !user || initialized) {
      return;
    }

    // Delay initial fetch to not block first paint
    const timerId = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) {
          setInitialized(true);
          return;
        }
        
        const res = await fetch('/api/user/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          setInitialized(true);
          return;
        }
        
        const data = await res.json();
        const favoritesData = data?.data?.favorites || data?.favorites || [];
        if (favoritesData) {
          setFavorites(favoritesData.map(id => normalizeId(id)));
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }, 2000); // 2s delay - let homepage render first

    return () => clearTimeout(timerId);
  }, [isAuthenticated, user, getAccessToken, initialized]);

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

    try {
      const token = await getAccessToken();
      if (!token) {
        return false;
      }
      
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      
      let res;
      if (isFav) {
        res = await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, {
          method: 'DELETE',
          headers
        });
      } else {
        res = await fetch('/api/user/favorites', {
          method: 'POST',
          headers,
          body: JSON.stringify({ recipe_id: normalizedId }),
        });
      }
      
      if (res.ok) {
        // Don't refresh immediately - FavoriteButton handles UI, global state syncs later
        // Optionally trigger background refresh after a delay
        setTimeout(() => refreshFavorites().catch(() => {}), 3000);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, [isAuthenticated, getAccessToken, favoriteSet, refreshFavorites]);

  const isFavorite = useCallback((recipeId) => {
    const normalizedId = normalizeId(recipeId);
    return favoriteSet.has(normalizedId);
  }, [favoriteSet]);

  return {
    favorites,
    loading: loading || authLoading,
    favoritesReady: initialized,
    toggleFavorite,
    isFavorite,
    isAuthenticated,
  };
}