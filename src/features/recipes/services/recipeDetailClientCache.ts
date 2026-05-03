/**
 * Recipe Detail Client Cache
 * 
 * In-memory cache for prefetching recipe detail to make modal open instant.
 * Uses fetch directly (not the API route) for single-call fetch.
 */

type CachedRecipeDetail = {
  recipe: any;
  cachedAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const detailCache = new Map<string, CachedRecipeDetail>();
const inflightRequests = new Map<string, Promise<any>>();

/**
 * Get cached recipe detail if available and not expired
 */
export function getCachedRecipeDetail(recipeId: string): any | null {
  if (!recipeId) return null;

  const key = String(recipeId);
  const cached = detailCache.get(key);
  
  if (!cached) return null;

  // Check TTL
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    detailCache.delete(key);
    return null;
  }

  return cached.recipe;
}

/**
 * Set cached recipe detail
 */
export function setCachedRecipeDetail(recipeId: string, recipe: any): void {
  if (!recipeId || !recipe) return;
  
  detailCache.set(String(recipeId), {
    recipe,
    cachedAt: Date.now()
  });
}

/**
 * Prefetch recipe detail in background
 * Returns cached result if available, or starts new fetch
 */
export function prefetchRecipeDetail(recipeId: string): Promise<any | null> {
  const key = String(recipeId || '');
  if (!key) return Promise.resolve(null);

  // Check cache first
  const cached = getCachedRecipeDetail(key);
  if (cached) {
    console.log('[recipe-prefetch] cache_hit', { recipeId: key });
    return Promise.resolve(cached);
  }

  // Check if already inflight
  const inflight = inflightRequests.get(key);
  if (inflight) {
    console.log('[recipe-prefetch] inflight_hit', { recipeId: key });
    return inflight;
  }

  // Start new fetch
  const traceId = `${key}-prefetch-${Date.now()}`;
  const start = Date.now();

  console.log('[recipe-prefetch] start', { recipeId: key, traceId });

  const promise = fetch(`/api/recipes/${key}`, {
    headers: {
      'x-perf-trace-id': traceId,
      'x-prefetch': 'recipe-detail'
    }
  })
    .then(res => {
      console.log('[recipe-prefetch] response_received', {
        recipeId: key,
        traceId,
        duration_ms: Date.now() - start,
        status: res.status
      });

      if (!res.ok) return null;
      return res.json();
    })
    .then(data => {
      const recipe = data?.recipe || null;

      if (recipe) {
        setCachedRecipeDetail(key, recipe);
      }

      console.log('[recipe-prefetch] done', {
        recipeId: key,
        traceId,
        duration_ms: Date.now() - start,
        hasRecipe: Boolean(recipe),
        ingredientCount: recipe?.ingredients?.length || 0,
        stepCount: recipe?.steps?.length || 0
      });

      return recipe;
    })
    .catch(err => {
      console.warn('[recipe-prefetch] failed', {
        recipeId: key,
        traceId,
        message: err?.message || String(err)
      });
      return null;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
}