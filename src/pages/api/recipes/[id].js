import { fetchRecipeDetail } from '@/lib/fetchRecipeDetail';
import { perfNow, perfMeasure } from '@/utils/perf';

/**
 * Single Recipe Detail API
 * Returns: { recipe: {...} }
 */
export default async function handler(req, res) {
  const handlerStart = perfNow();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    const { id } = req.query
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' })
    }

    const fetchStart = perfNow();
    const { recipe, error } = await fetchRecipeDetail(id);
    perfMeasure('api.recipeDetail.fetch', fetchStart);
    
    if (error || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.status(200).json({ recipe });
    perfMeasure('api.recipeDetail.total', handlerStart);
    
  } catch (error) {
    console.error('Recipe API error:', error)
    res.status(500).json({ error: error.message })
  }
}
