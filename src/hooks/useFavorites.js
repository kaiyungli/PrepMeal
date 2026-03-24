// Favorites hook - manages user favorites
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading, getAccessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load favorites when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setFavorites([]);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/user/favorites');
        console.log('[useFavorites] GET status:', res.status);
        
        if (!res.ok) {
          console.error('[useFavorites] GET failed:', res.status);
          return;
        }
        
        const data = await res.json();
        if (data.favorites) {
          setFavorites(data.favorites);
        }
      } catch (err) {
        console.error('[useFavorites] Failed to load favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, user]);

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!isAuthenticated) {
      console.log('[useFavorites] Not authenticated, skipping');
      return false;
    }

    const isFavorite = favorites.includes(recipeId);
    console.log('[useFavorites] Toggling:', recipeId, 'isFavorite:', isFavorite);

    try {
      let res;
      
      if (isFavorite) {
        // Remove favorite
        res = await fetch(`/api/user/favorites?recipe_id=${recipeId}`, {
          method: 'DELETE',
        });
      } else {
        // Add favorite
        res = await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe_id: recipeId }),
        });
      }
      
      console.log('[useFavorites] Response status:', res.status);
      
      // Only update state if request was successful
      if (res.ok) {
        if (isFavorite) {
          setFavorites(prev => prev.filter(id => id !== recipeId));
        } else {
          setFavorites(prev => [...prev, recipeId]);
        }
        return true;
      } else {
        console.error('[useFavorites] Failed:', await res.text());
        return false;
      }
    } catch (err) {
      console.error('[useFavorites] Error:', err);
      return false;
    }
  }, [isAuthenticated, favorites]);

  const isFavorite = useCallback((recipeId) => {
    return favorites.includes(recipeId);
  }, [favorites]);

  return {
    favorites,
    loading: loading || authLoading,
    toggleFavorite,
    isFavorite,
    isAuthenticated,
  };
}
