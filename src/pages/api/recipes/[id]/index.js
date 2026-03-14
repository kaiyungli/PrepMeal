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
    
    let ingredients_list = (ingredientData || [])
      .map(ri => ri.ingredients?.name)
      .filter(Boolean)
    
    // FALLBACK: If no ingredients in DB, use sample data
    if (ingredients_list.length === 0) {
      const sampleIngredients = {
        '滑蛋牛肉': ['牛肉', '雞蛋', '蔥', '鹽', '醬油'],
        '青椒牛肉': ['牛肉', '青椒', '蒜', '鹽', '醬油'],
        '洋蔥牛肉': ['牛肉', '洋蔥', '蒜', '鹽', '醬油'],
        '粟米雞粒': ['雞肉', '粟米', '蛋', '鹽'],
        '宮保雞丁': ['雞肉', '花生', '乾辣椒', '蔥', '醬油'],
        '咖哩雞': ['雞肉', '咖哩磚', '洋蔥', '薯仔', '椰漿'],
        '蒜香雞翼': ['雞翼', '蒜', '鹽', '醬油', '胡椒'],
        '蒸肉餅': ['豬肉', '馬蹄', '蔥', '鹽', '醬油'],
        '梅菜蒸肉餅': ['豬肉', '梅菜', '馬蹄', '蔥', '醬油'],
        '麻婆豆腐': ['豆腐', '牛肉', '豆瓣醬', '花椒', '蔥']
      }
      ingredients_list = sampleIngredients[recipe.name] || []
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
      ingredients_list: ingredients_list || [],
      steps: steps || []
    })
  } catch (err) {
    console.error('Supabase error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
