import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid recipe ID' })
  }

  try {
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

    const ingredients = (recipeIngredients || []).map((ri: any) => ({
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

    return res.status(200).json({
      ...recipe,
      ingredients: ingredients || [],
      steps: steps || []
    })
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
