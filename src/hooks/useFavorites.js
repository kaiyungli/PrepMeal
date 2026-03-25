// Favorites hook - manages user favorites
// Designed to not block initial page render
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';

// Schedule work to run when browser is idle
function scheduleIdleCallback(callback) {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback);
  }
  // Fallback to small timeout if requestIdleCallback not available
  return setTimeout(callback, 100);
}

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const refreshScheduledRef = useRef(false);

  // Use Set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Normalize ID to string for comparison
  const normalizeId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id);
  };

  // Load favorites when browser is idle - don't block first paint
  useEffect(() => {
    if (!isAuthenticated || !user || initialized) {
      return;
    }

    // Schedule fetch for when browser is idle
    const idleId = scheduleIdleCallback(async () => {
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
    });

    return () => {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
    };
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
        // Don't refresh immediately - FavoriteButton handles UI
        // Only schedule background refresh once (not after every click)
        if (!refreshScheduledRef.current) {
          refreshScheduledRef.current = true;
          scheduleIdleCallback(() => {
            refreshFavorites().catch(() => {});
            refreshScheduledRef.current = false;
          });
        }
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