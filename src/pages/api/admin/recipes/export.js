import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'

export default async function handler(req, res) {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all recipes with ingredients and steps
    const { data: recipes, error } = await supabaseServer
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get all ingredients and steps
    const recipeIds = (recipes || []).map(r => r.id)
    
    const { data: allIngredients } = await supabaseServer
      .from('recipe_ingredients')
      .select('*')
      .in('recipe_id', recipeIds)

    const { data: allSteps } = await supabaseServer
      .from('recipe_steps')
      .select('*')
      .in('recipe_id', recipeIds)

    // Build export format
    const exportData = (recipes || []).map(recipe => ({
      name: recipe.name,
      slug: recipe.slug,
      description: recipe.description,
      cuisine: recipe.cuisine,
      dish_type: recipe.dish_type,
      difficulty: recipe.difficulty,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      image_url: recipe.image_url,
      calories_per_serving: recipe.calories_per_serving,
      tags: recipe.tags || [],
      ingredients: (allIngredients || [])
        .filter(i => i.recipe_id === recipe.id)
        .map(i => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          notes: i.notes
        })),
      steps: (allSteps || [])
        .filter(s => s.recipe_id === recipe.id)
        .sort((a, b) => a.step_no - b.step_no)
        .map(s => ({
          text: s.text,
          time_seconds: s.time_seconds
        }))
    }))

    res.status(200).json(exportData)
  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: 'Export failed' })
  }
}
