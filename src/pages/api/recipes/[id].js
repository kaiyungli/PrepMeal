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
    if (!id) {
      perfLog({
        traceId,
        event: 'recipe_detail_api',
        stage: 'api_total',
        label: 'recipe_detail.api.total',
        start,
        meta: { recipeId: id || 'unknown', success: false }
      });
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    const { recipe, error } = await loadRecipeDetail(id);

    if (error || !recipe) {
      perfLog({
        traceId,
        event: 'recipe_detail_api',
        stage: 'api_total',
        label: 'recipe_detail.api.total',
        start,
        meta: { recipeId: id, success: false }
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

    return res.status(200).json({ recipe });
  } catch (err) {
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
