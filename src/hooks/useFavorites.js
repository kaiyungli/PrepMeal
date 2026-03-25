// Favorites hook - manages user favorites
// Does NOT fetch on mount - lazy loads to not block first paint
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Use Set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Normalize ID to string for comparison
  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Lazy load favorites AFTER initial render - don't block first paint
  useEffect(() => {
    if (!isAuthenticated || !user || hydrated) {
      return;
    }

    // Schedule for after paint
    const timerId = requestAnimationFrame(async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) {
          setHydrated(true);
          setLoading(false);
          return;
        }
        
        const res = await fetch('/api/user/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          setHydrated(true);
          setLoading(false);
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
        setHydrated(true);
      }
    });

    return () => cancelAnimationFrame(timerId);
  }, [isAuthenticated, user, getAccessToken, hydrated]);

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
      const start = Date.now();
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
      console.log('[Perf] Toggle favorite:', Date.now() - start, 'ms', isFav ? 'DELETE' : 'POST');
      
      if (res.ok) {
        // Background refresh (no await)
        refreshFavorites().catch(() => {});
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
    favoritesHydrated: hydrated,
    toggleFavorite,
    isFavorite,
    isAuthenticated,
  };
}