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

    // FALLBACK: If no ingredients in DB, use recipe.ingredients_list and lookup from ingredients table
    if (ingredients.length === 0 && ingredientsListFromDB.length > 0) {
      // Get unique ingredient names
      const ingredientNames = [...new Set(ingredientsListFromDB)]
      
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

    // Final fallback: derive from recipe and lookup in ingredients table
    if (ingredients.length === 0) {
      // Map English protein names to Chinese for lookup
      const proteinToChinese = {
        'beef': '牛肉', 'pork': '豬肉', 'chicken': '雞肉', 'fish': '魚',
        'shrimp': '蝦', 'tofu': '豆腐', 'egg': '雞蛋'
      }
      
      // Get ingredient names from primary_protein (mapped to Chinese)
      const primaryProtein = recipe.primary_protein?.toLowerCase()
      const chineseProtein = primaryProtein ? proteinToChinese[primaryProtein] : null
      
      const possibleNames = [
        chineseProtein,
        recipe.primary_protein,
        recipe.name
      ].filter(Boolean)
      
      if (possibleNames.length > 0) {
        // Try to lookup in ingredients table
        const { data: ingredientData } = await supabase
          .from('ingredients')
          .select('id, name, slug, shopping_category')
          .in('name', possibleNames)
          .limit(10)
        
        if (ingredientData && ingredientData.length > 0) {
          ingredients = ingredientData.map(ing => ({
            ingredient_id: ing.id,
            slug: ing.slug,
            display_name: ing.name,
            shopping_category: ing.shopping_category || '其他',
            quantity: null,
            unit: null,
            is_optional: false,
            source: 'derived'
          }))
        }
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
