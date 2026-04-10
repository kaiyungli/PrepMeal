// Central user state hook - combines auth + favorites
// This is an orchestration layer, no logic changes

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';

/**
 * Derive favorite recipes from a list
 * Returns filtered array based on favorites
 */
export function getFavoriteRecipes(recipes, favorites) {
  if (!recipes || !favorites) return [];
  const favSet = new Set(favorites.map(String));
  return recipes.filter(r => favSet.has(String(r.id)));
}

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
  
  // Token for favorites - only set when authenticated + token resolved
  const [token, setToken] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  
  useEffect(() => {
    if (!auth.loading) {
      if (auth.isAuthenticated) {
        auth.getAccessToken().then(t => {
          setToken(t);
          setTokenReady(true);
        });
      } else {
        setToken(null);
        setTokenReady(false);
      }
    }
  }, [auth.loading, auth.isAuthenticated, auth.getAccessToken]);
  
  // Only initialize useFavorites when token is ready (authenticated + token resolved)
  // This prevents duplicate API calls on initial load
  const fav = tokenReady && token ? useFavorites(token) : {
    favorites: [],
    isFavorite: () => false,
    toggleFavorite: async () => {},
    loading: true,
    error: null,
    isPending: false
  };
  
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