import { supabase } from '@/lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { recipeIds, pantryIngredients = [], servings = 1 } = req.body

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds is required' })
    }

    // 1. Fetch all recipe_ingredients for these recipes in one query
    const { data: recipeIngredients, error: riError } = await supabase
      .from('recipe_ingredients')
      .select('quantity, unit_id, recipe_id, ingredients(id, name, slug, shopping_category)')
      .in('recipe_id', recipeIds)

    if (riError) throw riError

    // 2. Get unique unit IDs and fetch in one query
    const unitIds = [...new Set(recipeIngredients?.map(ri => ri.unit_id).filter(Boolean) || [])]
    let unitsMap = new Map()
    if (unitIds.length > 0) {
      const { data: units } = await supabase
        .from('units')
        .select('id, code, name')
        .in('id', unitIds)
      unitsMap = new Map((units || []).map(u => [u.id, u]))
    }

    // 3. Build ingredient items with full metadata
    const items = []
    for (const ri of (recipeIngredients || [])) {
      const ing = ri.ingredients
      if (!ing) continue

      const unit = unitsMap.get(ri.unit_id)
      items.push({
        ingredient_id: ing.id,
        name: ing.name,
        display_name: ing.name,
        slug: ing.slug,
        quantity: ri.quantity ? Number(ri.quantity) : null,
        unit: unit ? { code: unit.code, name: unit.name } : null,
        category: ing.shopping_category || '其他',
        source: 'recipe_ingredients'
      })
    }

    // 4. Aggregate by ingredient_id + unit
    const aggregated = new Map()
    for (const item of items) {
      if (!item.ingredient_id || !item.name) continue
      
      // Aggregate by ingredient_id + unit.code to avoid incorrect merges
      const unitCode = item.unit?.code || 'no_unit'
      const key = `${item.ingredient_id}:${unitCode}`
      const existing = aggregated.get(key)
      const qty = item.quantity || 0
      
      if (existing) {
        existing.quantity = (existing.quantity || 0) + qty
      } else {
        aggregated.set(key, { ...item })
      }
    }

    // 5. Normalize quantities
    const normalized = Array.from(aggregated.values()).map(item => {
      let qty = item.quantity || 0
      const unit = item.unit?.code || ''
      
      // Round based on unit type
      if (unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'l') {
        qty = Math.round(qty)
      } else if (unit === 'tbsp' || unit === 'tsp') {
        qty = Math.round(qty * 2) / 2
      } else {
        qty = Math.round(qty * 100) / 100
      }
      
      return { ...item, quantity: qty }
    })

    // 6. Match against pantry (case-insensitive)
    const pantryLower = pantryIngredients.map(p => p.toLowerCase())
    const withPantryStatus = normalized.map(item => {
      const nameLower = item.name?.toLowerCase() || ''
      const slugLower = item.slug?.toLowerCase() || ''
      
      const inPantry = pantryLower.some(p => 
        nameLower.includes(p) || 
        slugLower.includes(p) ||
        p.includes(nameLower) ||
        p.includes(slugLower)
      )
      
      return { ...item, inPantry }
    })

    // 7. Separate pantry vs toBuy
    const pantry = withPantryStatus.filter(item => item.inPantry)
    const toBuy = withPantryStatus.filter(item => !item.inPantry)

    // 8. Group by category
    const categoryOrder = ['肉類', '海鮮', '蛋', '豆腐', '蔬菜', '調味料', '主食', '其他']
    const categoryMap = {
      // Meat
      'meat_seafood': '肉類', 'meat': '肉類', 'beef': '肉類', 'pork': '肉類', 'chicken': '肉類', 'lamb': '肉類', 'duck': '肉類',
      // Seafood
      'seafood': '海鮮', 'fish': '海鮮', 'shrimp': '海鮮', 'prawn': '海鮮', 'crab': '海鮮', 'squid': '海鮮', 'clam': '海鮮', 'oyster': '海鮮',
      // Eggs
      'egg': '蛋', 'eggs': '蛋',
      // Tofu
      'tofu': '豆腐', 'tofu_products': '豆腐',
      // Vegetables
      'vegetables': '蔬菜', 'produce': '蔬菜', 'vegetable': '蔬菜', 'mushroom': '蔬菜', 'mushrooms': '蔬菜',
      // Condiments
      'condiments': '調味料', 'seasoning': '調味料', 'sauce': '調味料', 'spice': '調味料', 'spices': '調味料',
      // Staples
      'staple': '主食', 'grains': '主食', 'rice': '主食', 'noodles': '主食', 'pasta': '主食', 'bread': '主食',
      // Other common
      'herbs': '蔬菜', 'herb': '蔬菜', 'garlic': '調味料', 'ginger': '調味料', 'onion': '蔬菜', 'scallion': '蔬菜',
      'lemon': '蔬菜', 'lime': '蔬菜'
    }

    const getCategory = (cat) => categoryMap[cat?.toLowerCase()] || '其他'

    const groupByCategory = (itemList) => {
      return categoryOrder.reduce((acc, cat) => {
        const filtered = itemList.filter(item => getCategory(item.category) === cat)
        if (filtered.length > 0) acc[cat] = filtered
        return acc
      }, {})
    }

    const pantryGrouped = groupByCategory(pantry)
    const toBuyGrouped = groupByCategory(toBuy)

    // 9. Format response
    const formatItem = (item) => ({
      name: item.display_name || item.name,
      quantity: item.quantity,
      unit: item.unit?.code || '',
      category: getCategory(item.category)
    })

    res.status(200).json({
      pantry: pantry.map(formatItem),
      toBuy: toBuy.map(formatItem),
      pantryGrouped,
      toBuyGrouped,
      totalItems: normalized.length,
      inPantry: pantry.length,
      toPurchase: toBuy.length
    })

  } catch (error) {
    console.error('Shopping list API error:', error)
    res.status(500).json({ error: error.message })
  }
}
