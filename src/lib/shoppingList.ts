import { normalizeIngredients } from './ingredientNormalizer'
import { CATEGORY_ORDER } from './ingredientCategories'

interface Ingredient {
  ingredient_id?: string | null
  name: string
  display_name?: string
  quantity: number | null
  unit?: string | null
  category?: string
  baseServings?: number
  targetServings?: number
  source?: string  // 'recipe_ingredients' or 'ingredients_list'
}

/**
 * Normalize ingredient name using the normalizer
 */
export function normalizeIngredientName(name: string): string {
  if (!name || typeof name !== 'string') return name
  const normalized = normalizeIngredients([name.trim()])
  return normalized[0] || name.trim()
}

/**
 * Merge ingredients with same name and unit
 */
export function mergeIngredients(list: Ingredient[]): Ingredient[] {
  if (!list || !Array.isArray(list)) return []
  
  // Filter to only include items with ingredient_id (from DB source)
  // Skip fallback items (they don't have proper ingredient_id)
  const validItems = list.filter(item => item.ingredient_id)
  
  const map = new Map<string, Ingredient>()
  
  for (const item of validItems) {
    // Skip invalid items
    let quantity = Number(item.quantity)
    if (!item || !item.name || Number.isNaN(quantity)) continue
    
    // Apply scaling if provided
    if (item.baseServings && item.targetServings) {
      quantity = quantity * (item.targetServings / item.baseServings)
    }
    
    // Use ingredient_id as key for aggregation
    const key = item.ingredient_id || item.name
    
    // Normalize unit
    const unit = normalizeUnit(item.unit) || '份'
    const qty = quantity || 1
    
    const existing = map.get(key)
    if (existing) {
      existing.quantity = (existing.quantity || 0) + qty
    } else {
      map.set(key, {
        name: item.name,
        quantity: Math.round(qty * 100) / 100,
        unit,
        category: item.category,
        ingredient_id: item.ingredient_id
      })
    }
  }
  
  return Array.from(map.values())
}

// Normalize unit to standard abbreviations
function normalizeUnit(unit: string | undefined | null): string {
  if (!unit) return ''
  
  const unitLower = unit.toLowerCase().trim()
  const unitMap: Record<string, string> = {
    'gram': 'g', 'grams': 'g', 'gramme': 'g', '克': 'g',
    'kilogram': 'kg', 'kilograms': 'kg', '千克': 'kg',
    'milliliter': 'ml', 'milliliters': 'ml', '毫升': 'ml',
    'liter': 'l', 'liters': 'l', '升': 'l',
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp', '大湯匙': 'tbsp',
    'teaspoon': 'tsp', 'teaspoons': 'tsp', '茶匙': 'tsp',
    'cup': 'cup', 'cups': 'cup', '杯': 'cup',
    'piece': 'pc', 'pieces': 'pc', '個': 'pc',
    'clove': '瓣', 'cloves': '瓣'
  }
  
  return unitMap[unitLower] || unit
}

/**
 * Group ingredients by category
 */
export function groupByCategory(list: Ingredient[]): Record<string, Ingredient[]> {
  if (!list || !Array.isArray(list)) return {}
  
  const grouped: Record<string, Ingredient[]> = {}
  
  // Initialize with category order
  CATEGORY_ORDER.forEach(cat => {
    grouped[cat] = []
  })
  
  // Add 'other' category for unknowns
  grouped['other'] = []
  
  for (const item of list) {
    const category = item.category || 'other'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(item)
  }
  
  // Remove empty categories and sort
  const result: Record<string, Ingredient[]> = {}
  CATEGORY_ORDER.forEach(cat => {
    if (grouped[cat]?.length > 0) {
      result[cat] = grouped[cat]
    }
  })
  
  // Add other
  if (grouped['other']?.length > 0) {
    result['其他'] = grouped['other']
  }
  
  return result
}

export interface ShoppingListResult {
  pantry: { name: string }[]
  toBuy: Ingredient[]
}

/**
 * Build shopping list from recipes and pantry
 * 1. Aggregate recipe ingredients
 * 2. Normalize ingredients
 * 3. Split into pantry vs toBuy
 * 4. Return structured result
 */
export function buildShoppingList(
  recipes: any[],
  pantryIngredients: string[] = [],
  servings: number = 1
): ShoppingListResult {
  console.log('[BUILD] input recipes:', recipes?.length);
  
  // 1. Collect all ingredients from recipes
  const allIngredients: Ingredient[] = []
  
  for (const recipe of recipes) {
    if (!recipe || !recipe.ingredients) continue
    
    const scale = servings / (recipe.base_servings || 1)
    
    for (const ing of recipe.ingredients) {
      // New format: display_name, shopping_category, unit.name, source
      const name = ing.display_name
      if (!name) continue
      
      const qty = ing.quantity ? Number(ing.quantity) * scale : null
      const unitName = ing.unit?.name || null
      
      allIngredients.push({
        ingredient_id: ing.ingredient_id || null,
        name: name,
        display_name: name,
        quantity: qty,
        unit: unitName,
        category: ing.shopping_category || '其他',
        source: ing.source || 'recipe_ingredients'
      })
    }
  }
  
  // 2. Normalize and merge
  const merged = mergeIngredients(allIngredients)
  
  // 3. Split into pantry vs toBuy using normalized comparison
  const pantryNorm = pantryIngredients.length > 0
    ? new Set(normalizeIngredients(pantryIngredients))
    : new Set()
  
  const pantry: { name: string }[] = []
  const toBuy: Ingredient[] = []
  
  for (const item of merged) {
    const normName = normalizeIngredientName(item.name)
    if (pantryNorm.has(normName)) {
      pantry.push({ name: item.name })
    } else {
      toBuy.push(item)
    }
  }
  
  console.log('[BUILD] pantry:', pantry.length);
  console.log('[BUILD] toBuy:', toBuy.length);
  
  return { pantry, toBuy }
}
