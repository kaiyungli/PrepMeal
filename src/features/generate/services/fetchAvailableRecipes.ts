/**
 * Fetch Available Recipes Service
 * 
 * Loads base recipe list from API with client-side cache.
 */
import { perfNow, perfMeasure, perfLog } from '@/utils/perf';

export interface Recipe {
  id: string | number;
  name: string;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  difficulty: string | null;
  method: string | null;
  total_time_minutes: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  protein: string[];
  primary_protein: string | null;
  dish_type: string | null;
  diet: string[];
  is_complete_meal: boolean;
}

const CACHE_KEY = 'generate_recipes_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachePayload {
  ts: number;
  recipes: Recipe[];
}

function getFromCache(): Recipe[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachePayload = JSON.parse(raw);
    if (!cached.ts || !Array.isArray(cached.recipes)) return null;
    const age = Date.now() - cached.ts;
    if (age > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    // Cache hit - log
    perfLog({
      event: 'generate_data_load',
      stage: 'recipes_cache_hit',
      label: 'generate.mount.recipes_cache_hit',
      duration: 0,
      meta: { recipeCount: cached.recipes.length, cacheAgeMs: age },
    });
    return cached.recipes;
  } catch {
    return null;
  }
}

function setToCache(recipes: Recipe[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachePayload = { ts: Date.now(), recipes };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    // Cache write log
    perfLog({
      event: 'generate_data_load',
      stage: 'recipes_cache_write',
      label: 'generate.mount.recipes_cache_write',
      duration: 0,
      meta: { recipeCount: recipes.length },
    });
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch available recipes for generation
 * @param limit - Max recipes to fetch
 * @returns Array of recipes
 */
export async function fetchAvailableRecipes(limit = 200): Promise<Recipe[]> {
  const t0 = perfNow();
  
  // Check cache first
  const cachedRecipes = getFromCache();
  if (cachedRecipes) {
    return cachedRecipes;
  }
  
  // Cache miss - fetch from API
  perfLog({
    event: 'generate_data_load',
    stage: 'recipes_cache_miss',
    label: 'generate.mount.recipes_cache_miss',
    duration: 0,
  });
  
  const res = await fetch(`/api/recipes?limit=${limit}&view=generate`);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch recipes: HTTP ${res.status}`);
  }
  
  const data = await res.json();
  const recipes = data.recipes || [];
  
  // Write to cache
  setToCache(recipes);
  
  perfMeasure('generate.recipesFetch', t0);
  
  return recipes;
}
