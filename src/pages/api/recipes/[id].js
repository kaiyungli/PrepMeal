import { getRecipeDetail } from '@/lib/recipeDetail'
import { normalizeRecipeDetail } from '@/lib/normalizeRecipeDetail'
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

    const detailStart = perfNow();
    const { recipe, ingredients, steps } = await getRecipeDetail(id)
    perfMeasure('api.recipeDetail.getRecipeDetail', detailStart);
    
    // Use shared normalization
    const normalizedRecipe = normalizeRecipeDetail(recipe, ingredients, steps);
    
    res.status(200).json({
      recipe: normalizedRecipe
    })
    perfMeasure('api.recipeDetail.total', handlerStart);
    
  } catch (error) {
    console.error('Recipe API error:', error)
    res.status(500).json({ error: error.message })
  }
}
