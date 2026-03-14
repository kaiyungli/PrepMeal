import { supabase } from '@/lib/supabaseClient'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    const { id } = req.query
    
    // Fetch recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (recipeError || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    // Fetch ingredients
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity, unit, ingredients(id, name, category)')
      .eq('recipe_id', id)

    const ingredients = (recipeIngredients || []).map(ri => ({
      name: ri.ingredients?.name || '',
      quantity: Number(ri.quantity) || 0,
      unit: ri.unit,
      category: ri.ingredients?.category || null
    }))

    // Also fetch ingredients_list (simple array of names)
    const { data: ingredientData } = await supabase
      .from('recipe_ingredients')
      .select('ingredients(name)')
      .eq('recipe_id', id)
    
    const ingredients_list = (ingredientData || [])
      .map(ri => ri.ingredients?.name)
      .filter(Boolean)

    // Fetch steps
    const { data: steps } = await supabase
      .from('recipe_steps')
      .select('step_no, text, time_seconds')
      .eq('recipe_id', id)
      .order('step_no')

    res.status(200).json({
      ...recipe,
      ingredients: ingredients || [],
      ingredients_list: ingredients_list || [],
      steps: steps || []
    })
  } catch (err) {
    console.error('Supabase error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
