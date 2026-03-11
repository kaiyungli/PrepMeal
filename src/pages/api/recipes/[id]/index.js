import { supabase } from '@/lib/supabaseClient'
import { ensureSupabase } from '@/lib/ensureSupabase'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  if (!ensureSupabase(res, supabase)) {
    return
  }
  
  try {
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
      .select('quantity, unit, ingredients(name)')
      .eq('recipe_id', id)

    const ingredients = (recipeIngredients || []).map(ri => ({
      name: ri.ingredients?.name || '',
      quantity: ri.quantity,
      unit: ri.unit
    }))

    // Fetch steps
    const { data: steps } = await supabase
      .from('recipe_steps')
      .select('step_no, text, time_seconds')
      .eq('recipe_id', id)
      .order('step_no')

    res.status(200).json({
      ...recipe,
      ingredients: ingredients || [],
      steps: steps || []
    })
  } catch (err) {
    console.error('Supabase error:', err.message)
    res.status(500).json({ error: 'Failed to fetch recipe' })
  }
}
