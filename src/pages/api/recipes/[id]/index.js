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
    
    // Fetch ingredients with proper joins
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity, unit_id, ingredients(id, name, slug, shopping_category), units(code, name)')
      .eq('recipe_id', id)

    // Build proper ingredient shape with source tracking
    let ingredients = (recipeIngredients || []).map(ri => ({
      ingredient_id: ri.ingredients?.id || null,
      slug: ri.ingredients?.slug || ri.ingredients?.name?.toLowerCase().replace(/\s+/g, '_') || '',
      display_name: ri.ingredients?.name || '',
      shopping_category: ri.ingredients?.shopping_category || '其他',
      quantity: Number(ri.quantity) || null,
      unit: ri.units ? { code: ri.units.code, name: ri.units.name } : (ri.unit_id ? { code: ri.unit_id, name: ri.unit_id } : null),
      is_optional: false,
      source: 'recipe_ingredients'
    }))

    // FALLBACK: If no ingredients in DB, use recipe.ingredients_list and lookup from ingredients table
    if (ingredients.length === 0 && recipe.ingredients_list && recipe.ingredients_list.length > 0) {
      // Get unique ingredient names from ingredients_list
      const ingredientNames = [...new Set(recipe.ingredients_list.filter(Boolean))]
      
      // Lookup ingredients by name from the ingredients table
      const { data: ingredientData } = await supabase
        .from('ingredients')
        .select('id, name, slug, shopping_category')
        .in('name', ingredientNames)
      
      // Build a map for quick lookup
      const ingredientMap = {}
      ;(ingredientData || []).forEach(ing => {
        ingredientMap[ing.name] = ing
      })
      
      // Map ingredients_list to proper format
      ingredients = ingredientNames.map(name => {
        const ing = ingredientMap[name]
        return {
          ingredient_id: ing?.id || null,
          slug: ing?.slug || name.toLowerCase().replace(/\s+/g, '_'),
          display_name: name,
          shopping_category: ing?.shopping_category || '其他',
          quantity: null,
          unit: null,
          is_optional: false,
          source: 'ingredients_list'
        }
      })
    }

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
    res.status(500).json({ error: err.message })
  }
}
