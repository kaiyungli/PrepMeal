import { supabase } from '@/lib/supabaseClient'

export default async function handler(req, res) {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }

    const { type } = req.query

    // A: Recipes with no ingredients
    if (type === 'missing-ingredients' || !type) {
      const { data: missingIngredients } = await supabase
        .rpc('get_recipes_without_ingredients')
      
      // Fallback: manual query if RPC doesn't exist
      if (!missingIngredients) {
        const { data: recipes } = await supabase
          .from('recipes')
          .select('id, name')
          .limit(100)
        
        const { data: recipeIngredients } = await supabase
          .from('recipe_ingredients')
          .select('recipe_id')
        
        const recipeIdsWithIngredients = new Set(recipeIngredients?.map(ri => ri.recipe_id) || [])
        const missing = recipes?.filter(r => !recipeIdsWithIngredients.has(r.id)) || []
        
        return res.status(200).json({
          type: 'missing-ingredients',
          count: missing.length,
          data: missing.slice(0, 20)
        })
      }
    }

    // B: Recipes with no steps
    if (type === 'missing-steps' || !type) {
      const { data: recipes } = await supabase
        .from('recipes')
        .select('id, name')
        .limit(100)
      
      const { data: recipeSteps } = await supabase
        .from('recipe_steps')
        .select('recipe_id')
      
      const recipeIdsWithSteps = new Set(recipeSteps?.map(rs => rs.recipe_id) || [])
      const missing = recipes?.filter(r => !recipeIdsWithSteps.has(r.id)) || []
      
      return res.status(200).json({
        type: 'missing-steps',
        count: missing.length,
        data: missing.slice(0, 20)
      })
    }

    // C: Ingredients missing shopping_category
    if (type === 'missing-category' || !type) {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, slug, shopping_category')
        .is('shopping_category', null)
        .limit(50)
      
      return res.status(200).json({
        type: 'missing-category',
        count: data?.length || 0,
        data: data || []
      })
    }

    // D: Recipe ingredients missing quantity/unit_id
    if (type === 'missing-quantity-unit' || !type) {
      const { data } = await supabase
        .from('recipe_ingredients')
        .select('id, recipe_id, ingredient_id, quantity, unit_id')
        .or('quantity.is.null,unit_id.is.null')
        .limit(50)
      
      return res.status(200).json({
        type: 'missing-quantity-unit',
        count: data?.length || 0,
        data: data || []
      })
    }

    // Summary: all counts
    const summary = {}
    
    // Count recipes
    const { count: recipeCount } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
    summary.totalRecipes = recipeCount

    // Count ingredients
    const { count: ingredientCount } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })
    summary.totalIngredients = ingredientCount

    // Count recipe_ingredients
    const { count: riCount } = await supabase
      .from('recipe_ingredients')
      .select('*', { count: 'exact', head: true })
    summary.totalRecipeIngredients = riCount

    // Count recipe_steps
    const { count: stepCount } = await supabase
      .from('recipe_steps')
      .select('*', { count: 'exact', head: true })
    summary.totalRecipeSteps = stepCount

    res.status(200).json({ summary })

  } catch (error) {
    console.error('Audit API error:', error)
    res.status(500).json({ error: error.message })
  }
}
