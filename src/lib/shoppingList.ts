import { normalizeIngredients } from './ingredientNormalizer'
import { CATEGORY_ORDER } from './ingredientCategories'

interface Ingredient {
  name: string
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
  
  const map = new Map<string, Ingredient>()
  
  for (const item of list) {
    // Skip invalid items - be tolerant of type issues
    let quantity = Number(item.quantity)
    if (!item || !item.name || Number.isNaN(quantity)) continue
    
    // Apply scaling if provided
    if (item.baseServings && item.targetServings) {
      quantity = quantity * (item.targetServings / item.baseServings)
    }
    
    // Normalize name
    const normalizedName = normalizeIngredientName(item.name)
    const unit = item.unit || '份'
    const qty = quantity || 1  // Default to 1 if null
    
    // Key by normalized name + unit
    const key = `${normalizedName}-${unit}`
    
    const existing = map.get(key)
    if (existing) {
      existing.quantity = (existing.quantity || 0) + qty
    } else {
      map.set(key, {
        name: normalizedName,
        quantity: Math.round(qty * 100) / 100,
        unit,
        category: item.category
      })
    }
  }
  
  return Array.from(map.values())
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
        name: name,
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
