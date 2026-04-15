/**
 * Fetch Generated Plan Shopping List Service
 * 
 * Uses new ShoppingListResponse format from API with client-side cache.
 */
import type { ShoppingListViewModel } from '@/features/shopping-list/types';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import { perfNow, perfLog } from '@/utils/perf';

export interface FetchShoppingListOptions {
  traceId?: string;
}

const CACHE_KEY = 'shopping_list_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachePayload {
  ts: number;
  key: string;
  data: ShoppingListViewModel;
}

function getCacheKey(recipeIds: string[], pantryIngredients: string[], servings: number): string {
  const recipeHash = recipeIds.slice().sort().join(',');
  const pantryHash = pantryIngredients.slice().sort().join(',');
  return `${recipeHash}|${pantryHash}|${servings}`;
}

function getFromCache(key: string): ShoppingListViewModel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    
    const cached: CachePayload = JSON.parse(raw);
    if (!cached.ts || !cached.key || !cached.data) return null;
    
    const age = Date.now() - cached.ts;
    if (age > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    if (cached.key !== key) return null;
    
    // Cache hit
    perfLog({
      event: 'shopping_list',
      stage: 'cache_hit',
      label: 'shopping_list.cache_hit',
      duration: 0,
      meta: {
        recipeCount: cached.data.summary?.toBuyCount || 0,
        cacheAgeMs: age,
      },
    });
    
    return cached.data;
  } catch {
    return null;
  }
}

function setToCache(key: string, data: ShoppingListViewModel): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachePayload = { ts: Date.now(), key, data };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch shopping list for generated plan
 * @param weeklyPlan - Current weekly plan { dayKey: [recipes] }
 * @param pantryIngredients - Pantry ingredients to exclude
 * @param servings - Servings multiplier
 * @returns ShoppingListViewModel ready for UI
 */
export async function fetchGeneratedPlanShoppingList(
  weeklyPlan: Record<string, any[]>,
  pantryIngredients: string[] = [],
  servings: number = 1,
  options: FetchShoppingListOptions = {}
): Promise<ShoppingListViewModel> {
  const t0 = perfNow();
  
  // Collect recipe IDs from plan
  const recipeIds: string[] = [];
  Object.values(weeklyPlan).forEach((recipes) => {
    if (Array.isArray(recipes)) {
      recipes.forEach((r) => {
        if (r?.id) recipeIds.push(String(r.id));
      });
    }
  });

  // Build cache key
  const cacheKey = getCacheKey(recipeIds, pantryIngredients, servings);
  
  // Check cache first
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  // Cache miss log
  perfLog({
    event: 'shopping_list',
    stage: 'cache_miss',
    label: 'shopping_list.cache_miss',
    duration: 0,
  });

  perfLog({
    event: 'shopping_list',
    stage: 'fetch_start',
    label: 'shopping_list.fetch.start',
    duration: 0,
    meta: {
      recipeCount: recipeIds.length,
      pantryCount: pantryIngredients.length,
      servings,
    },
  });

  if (recipeIds.length === 0) {
    const empty: ShoppingListViewModel = {
      pantry: [],
      sections: [],
      summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
      isEmpty: true,
    };
    setToCache(cacheKey, empty);
    return empty;
  }

  try {
    const fetchStart = perfNow();
    
    const res = await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'current',
        recipeIds,
        pantryIngredients,
        servings,
      }),
    });

    if (!res.ok) {
      let errorText = `API error: ${res.status}`;
      try {
        const errorBody = await res.text();
        if (errorBody) errorText += ` - ${errorBody}`;
      } catch {}
      throw new Error(errorText);
    }

    const response = await res.json();
    const fetchDuration = perfNow() - fetchStart;
    
    // Map to ViewModel
    const mapStart = perfNow();
    const viewModel = mapShoppingListResponseToViewModel(response);
    const mapDuration = perfNow() - mapStart;
    
    // Log fetch_total
    perfLog({
      event: 'shopping_list',
      stage: 'fetch_total',
      label: 'shopping_list.fetch.total',
      duration: fetchDuration,
      meta: {
        recipeCount: recipeIds.length,
        pantryCount: viewModel.summary?.pantryCount || 0,
        toBuyCount: viewModel.summary?.toBuyCount || 0,
        sectionCount: viewModel.summary?.sectionCount || 0,
      },
    });
    
    // Log map_total
    perfLog({
      event: 'shopping_list',
      stage: 'map_total',
      label: 'shopping_list.map.total',
      duration: mapDuration,
    });
    
    // Cache write
    setToCache(cacheKey, viewModel);
    perfLog({
      event: 'shopping_list',
      stage: 'cache_write',
      label: 'shopping_list.cache_write',
      duration: 0,
      meta: { recipeCount: recipeIds.length },
    });
    
    return viewModel;
  } catch (error) {
    const duration = perfNow() - t0;
    perfLog({
      event: 'shopping_list',
      stage: 'fetch_error',
      label: 'shopping_list.fetch.error',
      duration,
      meta: {
        recipeCount: recipeIds.length,
        message: (error as Error).message,
      },
    });
    throw error;
  }
}
