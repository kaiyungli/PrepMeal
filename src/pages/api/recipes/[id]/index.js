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

    // Also fetch ingredients_list (simple array of names) for fallback
    const { data: ingredientData } = await supabase
      .from('recipe_ingredients')
      .select('ingredients(name)')
      .eq('recipe_id', id)
    
    const ingredientsListFromDB = (ingredientData || [])
      .map(ri => ri.ingredients?.name)
      .filter(Boolean)

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

    // FALLBACK: If recipe_ingredients is empty, try getting ingredients_list from recipes table
    if (ingredients.length === 0 && ingredientsListFromDB.length === 0) {
      // Check if recipe has ingredients_list as JSON column
      const recipeIngredientsList = recipe.ingredients_list || []
      
      if (recipeIngredientsList.length > 0) {
        // Lookup each in ingredients table
        const { data: ingredientData } = await supabase
          .from('ingredients')
          .select('id, name, slug, shopping_category')
          .in('name', recipeIngredientsList)
        
        const ingredientMap = {}
        ;(ingredientData || []).forEach(ing => {
          ingredientMap[ing.name] = ing
        })
        
        ingredients = recipeIngredientsList.map(name => {
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
    }

    // Final fallback: use primary_protein to lookup in ingredients table
    if (ingredients.length === 0 && recipe.primary_protein) {
      // Look up primary protein in ingredients table by slug
      const { data: ingredientData } = await supabase
        .from('ingredients')
        .select('id, name, slug, shopping_category')
        .eq('slug', recipe.primary_protein.toLowerCase())
        .limit(1)
      
      if (ingredientData && ingredientData.length > 0) {
        const ing = ingredientData[0]
        ingredients = [{
          ingredient_id: ing.id,
          slug: ing.slug,
          display_name: ing.name,
          shopping_category: ing.shopping_category,
          quantity: null,
          unit: null,
          is_optional: false,
          source: 'derived'
        }]
      }
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
