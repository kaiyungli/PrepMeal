import { getRecipeDetail, formatIngredientForUI } from '@/lib/recipeDetail'
import { perfNow, perfMeasure } from '@/utils/perf';

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
    
    res.status(200).json({
      recipes: [{ ...recipe, ingredients: formattedIngredients, steps }]
    })
    perfMeasure('api.recipeDetail.total', handlerStart);
    
  } catch (error) {
    console.error('Recipe API error:', error)
    res.status(500).json({ error: error.message })
  }
}
