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
export function useUserState(options = {}) {
  const { skipFavorites = false } = options || {};
  // Auth state
  const auth = useAuth();

  // Token for favorites - only resolve when authenticated
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Skip token resolution when favorites are disabled
    if (skipFavorites) {
      setToken(null);
      return;
    }

    if (!auth.loading) {
      if (auth.isAuthenticated) {
        auth.getAccessToken().then(t => setToken(t));
      } else {
        setToken(null);
      }
    }
  }, [skipFavorites, auth.loading, auth.isAuthenticated, auth.getAccessToken]);

  // Always call useFavorites - pass null when token not ready (SWR won't fetch with null key)
  // This respects Hooks rules while preventing duplicate fetches
  const effectiveToken = skipFavorites ? null : token;
  const fav = useFavorites(effectiveToken, auth.user?.id);
  
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

    // Favorites - skip when requested
    favorites: skipFavorites ? undefined : fav.favorites,
    isFavorite: skipFavorites ? undefined : fav.isFavorite,
    toggleFavorite: skipFavorites ? undefined : fav.toggleFavorite,
    favoritesLoading: skipFavorites ? undefined : fav.loading,
    favoritesError: skipFavorites ? undefined : fav.error,
    isPending: skipFavorites ? undefined : fav.isPending,
  };
}