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

    // FALLBACK: If no ingredients in DB, use sample data
    // Also add fallback ingredients to ingredients array
    if (ingredients.length === 0) {
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
      const sampleNames = sampleIngredients[recipe.name] || []
      
      // Category mapping for common ingredients
      const categoryMap = {
        '牛肉': '肉類', '豬肉': '肉類', '雞肉': '肉類', '雞翼': '肉類',
        '魚': '海鮮', '蝦': '海鮮', '魚片': '海鮮',
        '雞蛋': '蛋類', '蛋': '蛋類',
        '豆腐': '豆腐',
        '青椒': '蔬菜', '洋蔥': '蔬菜', '蔥': '蔬菜', '薯仔': '蔬菜',
        '鹽': '雜貨', '醬油': '雜貨', '胡椒': '雜貨', '花生': '雜貨',
        '咖哩磚': '雜貨', '椰漿': '雜貨', '豆瓣醬': '雜貨', '花椒': '雜貨'
      }
      
      ingredients = sampleNames.map(name => ({
        ingredient_id: null,
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        display_name: name,
        shopping_category: categoryMap[name] || '其他',
        quantity: null,
        unit: null,
        is_optional: false,
        source: 'ingredients_list'
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
