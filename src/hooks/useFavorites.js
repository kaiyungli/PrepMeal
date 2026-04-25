// Favorites hook - single source of truth for favorite IDs
import useSWR, { mutate } from 'swr';
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

const normalizeId = (id) => {
  if (id === undefined || id === null) return '';
  return String(id);
};

// Browser check
const isBrowser = typeof window !== 'undefined';

// Cache key for sessionStorage
function getCacheKey(userIdentity) {
  return `favorites:${userIdentity || 'unknown'}`;
}

// Load favorites from sessionStorage cache
function loadCachedFavorites(userIdentity) {
  if (!isBrowser) return null;
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
  if (!isBrowser) return;
  try {
    sessionStorage.setItem(getCacheKey(userIdentity), JSON.stringify(favorites));
  } catch (_) {}
}

// Get stable user identity from token or userId
function getUserIdentity(token, userId) {
  if (userId) return userId;
  if (token) return token.slice(-12);
  return null;
}

// Fetcher for SWR - loads favorite IDs from API
const favoritesFetcher = async ([, , token]) => {
  if (!token) return [];
  
  const res = await fetch('/api/user/favorites', {
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
 */
export function useFavorites(token, userId) {
  const userIdentity = getUserIdentity(token, userId);
  
  // SWR cache key - null until auth is ready
  const swrKey = (token && shouldFetch && userIdentity)
    ? ['user-favorites', userIdentity, token]
    : null;
  
  // Initialize with empty array (cache loaded in useEffect)
  const [cachedFavorites, setCachedFavorites] = useState([]);
  
  // Track if we should fetch from API
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // Load cache on mount and when userIdentity changes
  useEffect(() => {
    if (!userIdentity) {
      setCachedFavorites([]);
      return;
    }
    const loaded = loadCachedFavorites(userIdentity) || [];
    setCachedFavorites(loaded);
  }, [userIdentity]);
  
  // Handle token changes
  useEffect(() => {
    if (!token) {
      setShouldFetch(false);
      setCachedFavorites([]);
      return;
    }
    // Small delay before API fetch
    const timer = setTimeout(() => {
      setShouldFetch(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [token]);
  
  // SWR for canonical favorites data
  const { data: apiFavorites = [], error, isLoading } = useSWR(
    shouldFetch ? swrKey : null,
    favoritesFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      fallbackData: [],
      shouldRetryOnError: false,
      onErrorRetry: (err, key, config, revalidate, options) => {
        const status = err?.status;
        if (status === 401 || status === 403) return;
        setTimeout(() => revalidate(), 5000);
      },
    }
  );
  
  // Per-recipe pending state
  const pendingRef = useRef(new Set());
  
  // Use API favorites when API has loaded, otherwise cached
  const hasApiLoaded = shouldFetch && !isLoading && !error && Array.isArray(apiFavorites);
  const favorites = hasApiLoaded ? apiFavorites : cachedFavorites;
  
  // Sync API favorites to cache after successful fetch
  useEffect(() => {
    if (hasApiLoaded && userIdentity) {
      setCachedFavorites(apiFavorites);
      saveCachedFavorites(userIdentity, apiFavorites);
    }
  }, [hasApiLoaded, userIdentity]);
  
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
    if (userIdentity) {
      saveCachedFavorites(userIdentity, newFavorites);
    }
    
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
        return true;
      }
      
      // API error - rollback
      mutate(swrKey, previousFavorites, false);
      setCachedFavorites(previousFavorites);
      if (userIdentity) {
        saveCachedFavorites(userIdentity, previousFavorites);
      }
      return false;
    } catch (_) {
      // Network error - rollback
      mutate(swrKey, previousFavorites, false);
      setCachedFavorites(previousFavorites);
      if (userIdentity) {
        saveCachedFavorites(userIdentity, previousFavorites);
      }
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