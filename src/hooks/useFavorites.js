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
 * Handles rapid consecutive toggles with latest-wins semantics
 */
export function useFavorites(token, userId) {
  const userIdentity = getUserIdentity(token, userId);
  
  // Track latest favorites via ref to avoid stale closure
  const latestFavoritesRef = useRef([]);
  
  // Sequence ID - increment to invalidate older requests
  const sequenceRef = useRef(0);
  
  // Initialize with empty array (cache loaded in useEffect)
  const [cachedFavorites, setCachedFavorites] = useState([]);
  
  // Track if we should fetch from API
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // SWR cache key - null until auth is ready
  const swrKey = (token && shouldFetch && userIdentity)
    ? ['user-favorites', userIdentity, token]
    : null;
  
  // Load cache on mount and when userIdentity changes
  useEffect(() => {
    if (!userIdentity) {
      setCachedFavorites([]);
      latestFavoritesRef.current = [];
      return;
    }
    const loaded = loadCachedFavorites(userIdentity) || [];
    setCachedFavorites(loaded);
    latestFavoritesRef.current = loaded;
  }, [userIdentity]);
  
  // Handle token changes
  useEffect(() => {
    if (!token) {
      setShouldFetch(false);
      setCachedFavorites([]);
      latestFavoritesRef.current = [];
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
    }
  );
  
  // Per-recipe pending state (visual only, not blocking)
  const pendingRef = useRef(new Set());
  
  // Use API favorites when API has loaded, otherwise cached
  const hasApiLoaded = shouldFetch && !isLoading && !error && Array.isArray(apiFavorites);
  const favorites = hasApiLoaded ? apiFavorites : cachedFavorites;
  
  // Always keep ref in sync with latest
  if (favorites !== latestFavoritesRef.current) {
    latestFavoritesRef.current = favorites;
  }
  
  // Sync API favorites to cache after successful fetch
  useEffect(() => {
    if (hasApiLoaded && userIdentity) {
      setCachedFavorites(apiFavorites);
      latestFavoritesRef.current = apiFavorites;
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
  
  // Toggle favorite - optimistic update with latest-wins
  const toggleFavorite = useCallback(async (recipeId) => {
    const normalizedId = normalizeId(recipeId);
    
    if (!token) return false;
    
    // Capture current sequence and latest favorites
    const mySequence = ++sequenceRef.current;
    const currentFavorites = latestFavoritesRef.current;
    
    // Mark as pending (for UI)
    pendingRef.current.add(normalizedId);
    pendingRef.current = new Set(pendingRef.current); // trigger re-render
    
    const isFav = currentFavorites.includes(normalizedId);
    
    // Calculate new state based on LATEST, not closure
    const newFavorites = isFav
      ? currentFavorites.filter(id => id !== normalizedId)
      : [...currentFavorites, normalizedId];
    
    // Optimistic update
    mutate(swrKey, newFavorites, false);
    setCachedFavorites(newFavorites);
    latestFavoritesRef.current = newFavorites;
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
      
      // Check if this request is still the latest
      if (sequenceRef.current !== mySequence) {
        // Newer request came in, ignore this result
        return true;
      }
      
      if (res.ok) {
        // Success - trigger revalidate to ensure sync
        mutate(swrKey);
        return true;
      }
      
      // API error - rollback to server state via revalidate
      mutate(swrKey, undefined, { revalidate: true });
      return false;
    } catch (_) {
      // Network error - rollback to server state via revalidate
      mutate(swrKey, undefined, { revalidate: true });
      return false;
    } finally {
      pendingRef.current.delete(normalizedId);
      pendingRef.current = new Set(pendingRef.current); // trigger re-render
    }
  }, [token, swrKey, userIdentity]);
  
  return {
    favorites,
    loading: isLoading,
    error,
    isFavorite,
    isPending,
    toggleFavorite,
  };
}
