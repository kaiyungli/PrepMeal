import { normalizeIngredients } from './ingredientNormalizer'
import { CATEGORY_ORDER } from './ingredientCategories'

interface Ingredient {
  name: string
  quantity: number
  unit?: string
  category?: string
  baseServings?: number
  targetServings?: number
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
    
    // Key by normalized name + unit
    const key = `${normalizedName}-${unit}`
    
    const existing = map.get(key)
    if (existing) {
      existing.quantity += quantity
    } else {
      map.set(key, {
        name: normalizedName,
        quantity: Math.round(quantity * 100) / 100,
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
  // 1. Collect all ingredients from recipes
  const allIngredients: Ingredient[] = []
  
  for (const recipe of recipes) {
    if (!recipe?.ingredients || !Array.isArray(recipe.ingredients)) continue
    
    const scale = servings / (recipe.base_servings || 1)
    
    for (const ing of recipe.ingredients) {
      if (!ing || !ing.name || typeof ing.quantity !== 'number') continue
      
      allIngredients.push({
        name: ing.name,
        quantity: (ing.quantity || 1) * scale,
        unit: ing.unit,
        category: ing.category
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
  
  return { pantry, toBuy }
}
