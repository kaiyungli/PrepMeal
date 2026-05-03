/**
 * Recipe Detail Public API
 * 
 * Single entry point for loading recipe detail.
 * Combines fetch + normalization.
 */
import { getRecipeDetail } from './services/getRecipeDetail';
import { normalizeRecipeDetail } from './mappers/normalizeRecipeDetail';

/**
 * Load and normalize recipe detail
 * @param recipeId - Recipe ID
 * @param traceId - Optional trace ID for performance tracking
 * @returns Normalized recipe or null
 */
export async function loadRecipeDetail(recipeId: string, traceId?: string) {
  const start = Date.now();
  
  try {
    const start = Date.now();
    
    const fetchStart = Date.now();
    const recipe = await getRecipeDetail(recipeId, traceId);

    console.log('[recipe-detail] service_fetch_done', {
      traceId,
      recipeId,
      duration_ms: Date.now() - fetchStart
    });

    const normalizeStart = Date.now();
    const normalized = normalizeRecipeDetail(recipe);

    console.log('[recipe-detail] normalize_done', {
      traceId,
      recipeId,
      duration_ms: Date.now() - normalizeStart,
      ingredientCount: normalized?.ingredients?.length || 0,
      stepCount: normalized?.steps?.length || 0
    });

    console.log('[recipe-detail] load_total_done', {
      traceId,
      recipeId,
      duration_ms: Date.now() - start
    });

    return { recipe: normalized, error: null };
  } catch (err) {
    console.error('[recipe-detail] load_failed', {
      traceId,
      recipeId,
      duration_ms: Date.now() - start,
      message: err instanceof Error ? err.message : String(err)
    });
    return { recipe: null, error: err instanceof Error ? err.message : 'Failed to load recipe' };
  }
}