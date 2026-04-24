import useSWR from 'swr';
import { fetcher } from '@/lib/swrConfig';
import { perfMeasure } from '@/utils/perf';

/**
 * Normalize recipe ID to string for comparison
 */
function normalizeId(id) {
  if (id === undefined || id === null) return '';
  return String(id);
}

/**
 * SWR key for user favorites
 */
function getFavoritesKey(url, token) {
  if (!token) return null;
  return [url, token];
}

/**
 * Favorites fetcher
 * - Extracts recipe IDs from favoritesData
 * - Returns Set of normalized IDs for O(1) lookup
 */
const favoritesFetcher = async ([url, token]) => {
  const fetchStart = perfMeasure('useFavorites.fetchStart', 0);
  if (!token) return new Set();

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) return new Set();
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const favoritesData = data?.data?.favorites || data?.favorites || [];
    perfMeasure('useFavorites.initialFetch', fetchStart);

    return favoritesData.map(id => normalizeId(id));
  } catch (err) {
    console.error('Favorites fetch error:', err);
    return new Set();
  }
};

/**
 * useFavorites hook
 * Returns:
 * - favorites: Set of favorited recipe IDs
 * - isFavorite(recipeId): boolean
 * - toggleFavorite(recipeId): function
 * - loading: boolean
 * - error: Error | null
 * - isPending: boolean (optimistic toggle pending)
 */
export function useFavorites(token) {
  const apiUrl = '/api/user/favorites';
  const swrKey = getFavoritesKey(apiUrl, token);

  const { data, error, mutate, isLoading } = useSWR(
    swrKey,
    favoritesFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      onErrorRetry: (err, key, config, revalidate, { retryCount }) => {
        if (err.message === 'HTTP 401' || retryCount > 2) return;
        setTimeout(() => revalidate({ retryCount }), 1000);
      },
    }
  );

  // favorites is Set of recipe IDs (for O(1) lookup)
  const favoritesSet = data instanceof Set ? data : new Set(data || []);

  // Check if a recipe is favorited
  const isFavorite = (recipeId) => {
    const normalizedId = normalizeId(recipeId);
    return favoritesSet.has(normalizedId);
  };

  // Toggle favorite status
  const toggleFavorite = async (recipeId) => {
    if (!token) return;

    const normalizedId = normalizeId(recipeId);
    const wasFavorited = favoritesSet.has(normalizedId);

    // Optimistic update
    await mutate(
      (currentData) => {
        const set = currentData instanceof Set ? new Set(currentData) : new Set(currentData || []);
        if (wasFavorited) {
          set.delete(normalizedId);
        } else {
          set.add(normalizedId);
        }
        return set;
      },
      { revalidate: false }
    );

    try {
      const method = wasFavorited ? 'DELETE' : 'POST';
      const endpoint = wasFavorited ? `/api/user/favorites?recipe_id=${normalizedId}` : '/api/user/favorites';
      const body = wasFavorited ? null : JSON.stringify({ recipe_id: recipeId });

      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(body && { body }),
      });

      if (!res.ok) {
        // Revalidate on failure
        await mutate();
      }
    } catch (err) {
      // Revalidate on failure
      await mutate();
    }
  };

  return {
    favorites: Array.from(favoritesSet),
    isFavorite,
    toggleFavorite,
    loading: isLoading,
    error,
    isPending: false,
  };
}

export default useFavorites;