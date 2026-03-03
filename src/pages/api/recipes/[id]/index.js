import { supabase } from '../../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    
    // Fetch full recipe details
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    // Fetch ingredients
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select('*, ingredients(*)')
      .eq('recipe_id', id)
    
    // Fetch equipment
    const { data: recipeEquipment } = await supabase
      .from('recipe_equipment')
      .select('*, equipment(*)')
      .eq('recipe_id', id)
    
    res.status(200).json({ 
      recipe: {
        ...recipe,
        ingredients: recipeIngredients || [],
        equipment: recipeEquipment || [],
      }
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
