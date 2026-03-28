// Central user state hook - combines auth + favorites
// This is an orchestration layer, no logic changes

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';

/**
 * useUserState - single hook for all user-related state
 * Combines useAuth + useFavorites
 * 
 * Returns:
 * - user, isAuthenticated, authLoading
 * - favorites, isFavorite, toggleFavorite, favoritesLoading
 */
export function useUserState() {
  // Auth state
  const auth = useAuth();
  
  // Token for favorites - load when auth is ready
  const [token, setToken] = useState(null);
  
  useEffect(() => {
    if (!auth.loading) {
      if (auth.isAuthenticated) {
        auth.getAccessToken().then(t => setToken(t));
      } else {
        setToken(null);
      }
    }
  }, [auth.loading, auth.isAuthenticated, auth.getAccessToken]);
  
  // Favorites state (pass token - hook handles null safely)
  const fav = useFavorites(token);
  
  return {
    // Auth
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    authLoading: auth.loading,
    signInWithGoogle: auth.signInWithGoogle,
    signInWithApple: auth.signInWithApple,
    signInWithFacebook: auth.signInWithFacebook,
    signOut: auth.signOut,
    getAccessToken: auth.getAccessToken,
    
    // Favorites
    favorites: fav.favorites,
    isFavorite: fav.isFavorite,
    toggleFavorite: fav.toggleFavorite,
    favoritesLoading: fav.loading,
    favoritesError: fav.error,
    isPending: fav.isPending,
  };
}