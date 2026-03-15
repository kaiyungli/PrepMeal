import { supabase } from '@/lib/supabaseClient'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    const { id } = req.query
    
    // OPTIMIZED: Single query to get recipe + ingredients + steps
    const [recipeResult, ingredientsResult, stepsResult] = await Promise.all([
      // 1. Fetch recipe
      supabase.from('recipes').select('*').eq('id', id).single(),
      // 2. Fetch recipe_ingredients with ingredient details in ONE query
      supabase
        .from('recipe_ingredients')
        .select('quantity, unit_id, ingredients(id, name, slug, shopping_category)')
        .eq('recipe_id', id),
      // 3. Fetch steps
      supabase
        .from('recipe_steps')
        .select('step_no, text, time_seconds')
        .eq('recipe_id', id)
        .order('step_no')
    ])
    
    const { data: recipe, error: recipeError } = recipeResult
    if (recipeError || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    const { data: recipeIngredients } = ingredientsResult
    const { data: steps } = stepsResult
    
    // Get unique unit IDs and fetch in ONE query
    const unitIds = [...new Set((recipeIngredients || []).map(ri => ri.unit_id).filter(Boolean))]
    let unitsMap = new Map()
    if (unitIds.length > 0) {
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, code, name')
        .in('id', unitIds)
      unitsMap = new Map((unitsData || []).map(u => [u.id, u]))
    }
    
    // Build ingredient items
    const ingredients = (recipeIngredients || []).map(ri => {
      const unit = unitsMap.get(ri.unit_id)
      return {
        ingredient_id: ri.ingredients?.id || null,
        slug: ri.ingredients?.slug || '',
        display_name: ri.ingredients?.name || '',
        shopping_category: ri.ingredients?.shopping_category || '其他',
        quantity: ri.quantity ? Number(ri.quantity) : null,
        unit: unit ? { code: unit.code, name: unit.name } : null,
        is_optional: false,
        source: 'recipe_ingredients'
      }
    })
    
    // Return optimized response
    res.status(200).json({
      ...recipe,
      ingredients,
      steps: steps || []
    })
    
  } catch (error) {
    console.error('Recipe API error:', error)
    res.status(500).json({ error: error.message })
  }
}
