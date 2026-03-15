import { getRecipeDetail, formatIngredientForUI } from '@/lib/recipeDetail'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    const { id } = req.query
    
    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' })
    }

    const { recipe, ingredients, steps } = await getRecipeDetail(id)
    
    // Format ingredients for UI
    const formattedIngredients = ingredients.map(formatIngredientForUI)
    
    res.status(200).json({
      ...recipe,
      ingredients: formattedIngredients,
      steps
    })
    
  } catch (error) {
    console.error('Recipe API error:', error)
    res.status(500).json({ error: error.message })
  }
}
