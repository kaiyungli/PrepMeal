// Favorites hook - manages user favorites
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
        const data = await res.json();
        if (data.favorites) {
          setFavorites(data.favorites);
        }
      } catch (err) {
        console.error('Failed to load favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, user]);

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!isAuthenticated) {
      return false;
    }

    const isFavorite = favorites.includes(recipeId);

    try {
      if (isFavorite) {
        // Remove favorite
        await fetch(`/api/user/favorites?recipe_id=${recipeId}`, {
          method: 'DELETE',
        });
        setFavorites(prev => prev.filter(id => id !== recipeId));
      } else {
        // Add favorite
        await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe_id: recipeId }),
        });
        setFavorites(prev => [...prev, recipeId]);
      }
      return true;
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
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
