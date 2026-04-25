// Favorites hook - single source of truth for favorite IDs
import useSWR, { mutate } from 'swr';
import { perfMeasure } from '@/utils/perf';
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

const normalizeId = (id) => {
  if (id === undefined || id || null) return '';
  return String(id);
};

// Cache key for sessionStorage
function getCacheKey(userIdentity) {
  return `favorites:${userIdentity || 'unknown'}`;
}

// Load favorites from sessionStorage cache
function loadCachedFavorites(userIdentity) {
  try {
    const cached = sessionStorage.getItem(getCacheKey(userIdentity));
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.map(id => normalizeId(id));
      }
    }
  } catch (_) {}
  return null;
}

// Save favorites to sessionStorage cache
function saveCachedFavorites(userIdentity, favorites) {
  try {
    sessionStorage.setItem(getCacheKey(userIdentity), JSON.stringify(favorites));
  } catch (_) {}
}

// Clear favorites cache for user
function clearCachedFavorites(userIdentity) {
  try {
    sessionStorage.removeItem(getCacheKey(userIdentity));
  } catch (_) {}
}

// Get stable user identity from token or userId
function getUserIdentity(token, userId) {
  if (userId) return userId;
  if (token) return token.slice(-12);
  return 'anonymous';
}

// Fetcher for SWR - loads favorite IDs from API
const favoritesFetcher = async ([url, token]) => {
  if (!token) return [];
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const error = new Error(`Failed to load favorites: ${res.status} ${res.statusText}`);
    error.status = res.status;
    throw error;
  }
  
  const data = await res.json();
  const favoritesData = data?.data?.favorites || data?.favorites || [];
  return favoritesData.map(id => normalizeId(id));
};

/**
 * useFavorites - single source of truth for favorite IDs
 * @param {string} token - Access token (from page)
 * @param {string} userId - User ID for cache key (optional but recommended)
 * 
 * Features:
 * - SessionStorage cache for instant UI
 * - Background API revalidation
 * - Optimistic toggle with rollback
 */
export function useFavorites(token, userId) {
  const [isFetchReady, setIsFetchReady] = useState(false);
  
  const userIdentity = getUserIdentity(token, userId);
  const cacheKey = getCacheKey(userIdentity);
  
  // Load cached favorites synchronously on mount
  const [cachedFavorites, setCachedFavorites] = useState(() => {
    return loadCachedFavorites(userIdentity) || [];
  });
  
  // SWR cache key includes stable user identity
  const swrKey = token ? ['user-favorites', userIdentity, token] : null;
  
  // Fetch from API after auth is ready
  useEffect(() => {
    setIsFetchReady(false); // Reset on token change
    if (!token) {
      // Clear cache on logout
      clearCachedFavorites(userIdentity);
      setCachedFavorites([]);
      return;
    }
    // Small delay for network fetch, but cache shows immediately
    const timer = setTimeout(() => {
      setIsFetchReady(true);
    }, 100); // Reduced from 800ms - cache shows instantly
    return () => clearTimeout(timer);
  }, [token, userIdentity]);
  
  // SWR for canonical favorites data
  const { data: apiFavorites = [], error, isLoading } = useSWR(
    swrKey,
    favoritesFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      // Start with cached data, revalidate in background
      fallbackData: cachedFavorites,
      shouldRetryOnError: false,
      onErrorRetry: (err, key, config, revalidate, options) => {
        const status = err?.status;
        if (status === 401 || status === 403) return;
        setTimeout(() => revalidate(), 5000);
      },
    }
  );
  
  // Sync API favorites to state and cache
  useEffect(() => {
    if (apiFavorites.length > 0 && isFetchReady) {
      setCachedFavorites(apiFavorites);
      saveCachedFavorites(userIdentity, apiFavorites);
    }
  }, [apiFavorites, userIdentity, isFetchReady]);
  
  // Per-recipe pending state
  const pendingRef = useRef(new Set());
  
  // Use API favorites when available, otherwise cached
  const favorites = apiFavorites.length > 0 ? apiFavorites : cachedFavorites;
  
  // Derived Set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  
  const isFavorite = useCallback((recipeId) => {
    if (!recipeId) return false;
    return favoriteSet.has(normalizeId(recipeId));
  }, [favoriteSet]);
  
  const isPending = useCallback((recipeId) => {
    if (!recipeId) return false;
    return pendingRef.current.has(normalizeId(recipeId));
  }, []);
  
  // Toggle favorite - optimistic update with cache sync
  const toggleFavorite = useCallback(async (recipeId) => {
    const normalizedId = normalizeId(recipeId);
    
    if (!token) return false;
    if (pendingRef.current.has(normalizedId)) return false;
    
    pendingRef.current.add(normalizedId);
    
    const isFav = favorites.includes(normalizedId);
    const previousFavorites = [...favorites];
    
    // Optimistic update
    const newFavorites = isFav
      ? favorites.filter(id => id !== normalizedId)
      : [...favorites, normalizedId];
    
    // Update both SWR cache and sessionStorage
    mutate(swrKey, newFavorites, false);
    setCachedFavorites(newFavorites);
    saveCachedFavorites(userIdentity, newFavorites);
    
    try {
      const res = isFav
        ? await fetch(`/api/user/favorites?recipe_id=${normalizedId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          })
        : await fetch('/api/user/favorites', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe_id: normalizedId })
          });
      
      if (res.ok) {
        // Success - cache already updated optimistically
        return true;
      }
      
      // API error - rollback
      mutate(swrKey, previousFavorites, false);
      setCachedFavorites(previousFavorites);
      saveCachedFavorites(userIdentity, previousFavorites);
      return false;
    } catch (_) {
      // Network error - rollback
      mutate(swrKey, previousFavorites, false);
      setCachedFavorites(previousFavorites);
      saveCachedFavorites(userIdentity, previousFavorites);
      return false;
    } finally {
      pendingRef.current.delete(normalizedId);
    }
  }, [token, swrKey, userIdentity, favorites]);
  
  return {
    favorites,
    loading: isLoading,
    error,
    isFavorite,
    isPending,
    toggleFavorite,
  };
}