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

    // Final fallback: if DB is completely empty, derive from recipe name
    if (ingredients.length === 0) {
      // Map recipe name to common ingredients (simple heuristic)
      const nameToIngredients = {
        '滑蛋牛肉': ['牛肉', '雞蛋', '蔥'],
        '青椒牛肉': ['牛肉', '青椒', '蒜'],
        '洋蔥牛肉': ['牛肉', '洋蔥', '蒜'],
        '粟米雞粒': ['雞肉', '粟米', '蛋'],
        '宮保雞丁': ['雞肉', '花生', '蔥'],
        '咖哩雞': ['雞肉', '咖哩', '洋蔥'],
        '蒜香雞翼': ['雞翼', '蒜'],
        '蒸肉餅': ['豬肉', '馬蹄', '蔥'],
        '梅菜蒸肉餅': ['豬肉', '梅菜', '蔥'],
        '麻婆豆腐': ['豆腐', '牛肉', '蔥']
      }
      const names = nameToIngredients[recipe.name] || [recipe.primary_protein || '肉'].filter(Boolean)
      ingredients = names.map(name => ({
        ingredient_id: null,
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        display_name: name,
        shopping_category: '其他',
        quantity: null,
        unit: null,
        is_optional: false,
        source: 'derived'
      }))
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
