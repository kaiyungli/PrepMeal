/**
 * API: Recipe Detail
 * 
 * Single endpoint for recipe detail.
 * Uses unified recipe service.
 */
import { loadRecipeDetail } from '@/features/recipes';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    const { recipe, error } = await loadRecipeDetail(id);

    if (error || !recipe) {
      return res.status(404).json({ error: error || 'Recipe not found' });
    }

    return res.status(200).json({ recipe });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
