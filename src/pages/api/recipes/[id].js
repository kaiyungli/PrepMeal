/**
 * API: Recipe Detail
 * 
 * Single endpoint for recipe detail.
 * Uses unified recipe service.
 */
import { loadRecipeDetail } from '@/features/recipes';
import { perfNow, perfLog } from '@/utils/perf';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const start = perfNow();
  const traceId = req.headers['x-perf-trace-id'] || null;
  const { id } = req.query;

  try {
    console.log('[recipe-detail-api] request_start', {
      traceId,
      id
    });

    if (!id) {
      perfLog({
        traceId,
        event: 'recipe_detail_api',
        stage: 'api_total',
        label: 'recipe_detail.api.total',
        start,
        meta: { recipeId: id || 'unknown', success: false }
      });
      console.log('[recipe-detail-api] response_not_found', {
        traceId,
        id,
        duration_ms: Math.round(perfNow() - start),
        error: 'Recipe ID is required'
      });
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    const loadStart = perfNow();
    const { recipe, error } = await loadRecipeDetail(id, traceId);

    console.log('[recipe-detail-api] load_done', {
      traceId,
      id,
      duration_ms: Math.round(perfNow() - loadStart),
      hasRecipe: Boolean(recipe),
      hasError: Boolean(error)
    });

    if (error || !recipe) {
      perfLog({
        traceId,
        event: 'recipe_detail_api',
        stage: 'api_total',
        label: 'recipe_detail.api.total',
        start,
        meta: { recipeId: id, success: false }
      });
      console.log('[recipe-detail-api] response_not_found', {
        traceId,
        id,
        duration_ms: Math.round(perfNow() - start),
        error: error || 'Recipe not found'
      });
      return res.status(404).json({ error: error || 'Recipe not found' });
    }

    perfLog({
      traceId,
      event: 'recipe_detail_api',
      stage: 'api_total',
      label: 'recipe_detail.api.total',
      start,
      meta: { recipeId: id, success: true }
    });

    console.log('[recipe-detail-api] response_ready', {
      traceId,
      id,
      duration_ms: Math.round(perfNow() - start)
    });

    return res.status(200).json({ recipe });
  } catch (err) {
    console.error('[recipe-detail-api] request_failed', {
      traceId,
      id,
      duration_ms: Math.round(perfNow() - start),
      message: err.message,
      stack: err.stack
    });
    perfLog({
      traceId,
      event: 'recipe_detail_api',
      stage: 'api_total',
      label: 'recipe_detail.api.total',
      start,
      meta: { recipeId: id, success: false }
    });
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}