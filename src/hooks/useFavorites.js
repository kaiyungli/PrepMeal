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
        // Get access token for Authorization header
        const token = await getAccessToken();
        console.log('[useFavorites] Token available:', !!token);
        
        if (!token) {
          console.error('[useFavorites] No token - user may need to re-login');
          return;
        }
        
        const res = await fetch('/api/user/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[useFavorites] GET status:', res.status);
        
        if (!res.ok) {
          console.error('[useFavorites] GET failed:', res.status);
          return;
        }
        
        const data = await res.json();
        console.log('[useFavorites] GET response:', data);
        
        // API returns { success: true, data: { favorites: [...] } }
        const favoritesData = data?.data?.favorites || data?.favorites || [];
        if (favoritesData) {
          setFavorites(favoritesData.map(id => normalizeId(id)));
        }
      } catch (err) {
        console.error('[useFavorites] Failed to load favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, user, getAccessToken]);

  const toggleFavorite = useCallback(async (recipeId) => {
    console.log('[useFavorites] toggleFavorite called', { recipeId, isAuthenticated });
    console.log('[useFavorites] auth state', { 
      isAuthenticated, 
      userId: user?.id || null, 
      favoritesCount: favorites.length 
    });
    
    if (!isAuthenticated) {
      console.log('[useFavorites] Not authenticated - returning false');
      return false;
    }

    // Normalize ID to string
    const normalizedId = normalizeId(recipeId);
    const isFav = favorites.includes(normalizedId);
    console.log('[useFavorites] Toggling:', normalizedId, 'isFavorite:', isFav, 'favorites:', favorites);

    try {
      const token = await getAccessToken();
      console.log('[useFavorites] Token:', !!token);
      
      if (!token) {
        console.error('[useFavorites] Missing token - need re-login');
        return false;
      }
      
      let res;
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      
      if (isFav) {
        // Remove favorite
        console.log('[useFavorites] DELETE request');
        res = await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, {
          method: 'DELETE',
          headers
        });
      } else {
        // Add favorite
        console.log('[useFavorites] POST request');
        res = await fetch('/api/user/favorites', {
          method: 'POST',
          headers,
          body: JSON.stringify({ recipe_id: normalizedId }),
        });
      }
      
      console.log('[useFavorites] Response status:', res.status);
      const responseBody = await res.text();
      console.log('[useFavorites] Response body:', responseBody);
      
      // Only update state if request was successful
      if (res.ok) {
        if (isFav) {
          setFavorites(prev => prev.filter(id => id !== normalizedId));
          console.log('[useFavorites] Removed from favorites');
        } else {
          setFavorites(prev => [...prev, normalizedId]);
          console.log('[useFavorites] Added to favorites');
        }
        return true;
      } else {
        console.error('[useFavorites] Failed:', responseBody);
        return false;
      }
    } catch (err) {
      console.error('[useFavorites] Error:', err);
      return false;
    }
  }, [isAuthenticated, favorites, getAccessToken]);

  const isFavorite = useCallback((recipeId) => {
    const normalizedId = normalizeId(recipeId);
    const result = favorites.includes(normalizedId);
    console.log('[useFavorites] isFavorite check:', normalizedId, 'result:', result, 'favorites:', favorites);
    return result;
  }, [favorites]);

  return {
    favorites,
    loading: loading || authLoading,
    toggleFavorite,
    isFavorite,
    isAuthenticated,
  };
}
