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

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    const { recipe, error } = await loadRecipeDetail(id);

    const end = perfNow();
    perfLog({
      traceId,
      event: 'recipe_detail_api',
      stage: 'api_total',
      label: 'recipe_detail.api.total',
      start,
      end,
      meta: { recipeId: id }
    });

    if (error || !recipe) {
      return res.status(404).json({ error: error || 'Recipe not found' });
    }

    return res.status(200).json({ recipe });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
