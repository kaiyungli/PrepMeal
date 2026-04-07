import { getRecipeDetail, formatIngredientForUI } from '@/lib/recipeDetail'
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
    
    // Format ingredients for UI
    const formattedIngredients = ingredients.map(formatIngredientForUI)
    
    // Normalize steps to plain strings
    const normalizedSteps = (steps || []).map((step) => {
      if (typeof step === 'string') return step;
      return step?.text || step?.instruction || step?.description || '';
    }).filter(Boolean);
    
    // Return single recipe object (clean contract)
    res.status(200).json({
      recipe: { ...recipe, ingredients: formattedIngredients, steps: normalizedSteps }
    })
    perfMeasure('api.recipeDetail.total', handlerStart);
    
  } catch (error) {
    console.error('Recipe API error:', error)
    res.status(500).json({ error: error.message })
  }
}
