/**
 * Fetch Available Recipes Service
 * 
 * Loads base recipe list from API with client-side cache.
 */
import { perfNow, perfMeasure, perfLog } from '@/utils/perf';
import { findCatalogueIdProblem } from './catalogueIdentity';

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
  budget_level?: 'budget' | 'normal' | 'premium' | null;
}

// v1 cached only the first page even when the caller requested 200 recipes.
// v2 cached a pool capped at 200 with no completeness proof. v3 caches only a
// catalogue verified against the complete-catalogue contract.
const CACHE_KEY = 'generate_recipes_v3';
const CACHE_CONTRACT = 'generate-complete-catalogue-v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachePayload {
  contract: typeof CACHE_CONTRACT;
  ts: number;
  total: number;
  complete: true;
  recipes: Recipe[];
}

/**
 * Throws unless `data` proves it is the complete Generate catalogue:
 * complete === true, a valid total, recipes.length === total, usable unique IDs.
 */
function verifyCompleteCatalogue(data: unknown): Recipe[] {
  const body = data as { complete?: unknown; total?: unknown; recipes?: unknown } | null;
  if (!body || body.complete !== true) {
    throw new Error('Generate catalogue is not marked complete');
  }
  if (!Number.isInteger(body.total) || (body.total as number) < 0) {
    throw new Error('Generate catalogue total is invalid');
  }
  if (!Array.isArray(body.recipes)) {
    throw new Error('Generate catalogue recipes are missing');
  }
  const recipes = body.recipes as Recipe[];
  if (recipes.length !== body.total) {
    throw new Error(`Generate catalogue incomplete: ${recipes.length} of ${body.total}`);
  }
  const idProblem = findCatalogueIdProblem(recipes);
  if (idProblem === 'missing_id') throw new Error('Generate catalogue contains a recipe without a usable id');
  if (idProblem === 'duplicate_id') throw new Error('Generate catalogue contains a duplicate id');
  return recipes;
}

function getFromCache(): Recipe[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachePayload> | null;
    const age = typeof cached?.ts === 'number' ? Date.now() - cached.ts : NaN;
    let recipes: Recipe[] | null = null;
    if (cached?.contract === CACHE_CONTRACT && age >= 0 && age <= CACHE_TTL_MS) {
      try {
        recipes = verifyCompleteCatalogue(cached);
      } catch {
        recipes = null;
      }
    }
    if (!recipes) {
      // Expired, corrupt or unverifiable: never trust it.
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    // Cache hit - log
    perfLog({
      event: 'generate_data_load',
      stage: 'recipes_cache_hit',
      label: 'generate.mount.recipes_cache_hit',
      duration: 0,
      meta: { recipeCount: recipes.length, cacheAgeMs: age },
    });
    return recipes;
  } catch {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    return null;
  }
}

function setToCache(recipes: Recipe[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachePayload = {
      contract: CACHE_CONTRACT,
      ts: Date.now(),
      total: recipes.length,
      complete: true,
      recipes,
    };
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
 * Fetch the complete Generate candidate catalogue.
 *
 * One request; the server owns pagination and completeness. Resolves only
 * with a verified complete catalogue, otherwise rejects (fail closed).
 * @returns Array of recipes
 */
export async function fetchAvailableRecipes(): Promise<Recipe[]> {
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
  
  const res = await fetch('/api/recipes?view=generate');
  if (!res.ok) {
    throw new Error(`Failed to fetch recipes: HTTP ${res.status}`);
  }
  const recipes = verifyCompleteCatalogue(await res.json());
  
  // Write to cache only after full verification
  setToCache(recipes);
  
  perfMeasure('generate.recipesFetch', t0);
  
  return recipes;
}
