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

// Raw rows are validated by parseQuantity before becoming merged ingredients.
type IngredientInput = Omit<Ingredient, 'quantity'> & {
  quantity?: number | string | null
}

/**
 * Normalize ingredient name using the normalizer
 */
export function normalizeIngredientName(name: string): string {
  if (!name || typeof name !== 'string') return name
  const normalized = normalizeIngredients([name.trim()])
  return normalized[0] || name.trim()
}

// A usable amount is a finite positive number. Missing (null/undefined) or
// zero amounts mean "unknown amount": the item stays listed with quantity
// null rather than being invented as 1. Anything else (non-numeric text,
// negative, infinite) is a corrupt row and is skipped.
function parseQuantity(raw: unknown): { valid: boolean; quantity: number | null } {
  if (raw === null || raw === undefined) return { valid: true, quantity: null }
  const quantity = Number(raw)
  if (!Number.isFinite(quantity) || quantity < 0) return { valid: false, quantity: null }
  return { valid: true, quantity: quantity > 0 ? quantity : null }
}

// Serving counts must be finite and positive to scale by; otherwise no scaling.
function servingScale(target: unknown, base: unknown): number {
  const t = Number(target)
  const b = Number(base)
  return Number.isFinite(t) && t > 0 && Number.isFinite(b) && b > 0 ? t / b : 1
}

/**
 * Merge ingredients with same ingredient_id and normalized unit.
 * Different units of one ingredient stay separate lines; no unit conversion.
 */
export function mergeIngredients(list: (IngredientInput | null | undefined)[]): Ingredient[] {
  if (!list || !Array.isArray(list)) return []
  
  // Filter to only include items with ingredient_id (from DB source)
  // Skip fallback items (they don't have proper ingredient_id)
  const validItems = list.filter((item): item is IngredientInput => Boolean(item?.ingredient_id))
  
  const map = new Map<string, Ingredient>()
  
  for (const item of validItems) {
    // Skip invalid items
    if (!item.name) continue
    const parsed = parseQuantity(item.quantity)
    if (!parsed.valid) continue
    
    // Apply scaling if provided
    const qty = parsed.quantity === null
      ? null
      : parsed.quantity * servingScale(item.targetServings, item.baseServings)
    
    // Aggregate by ingredient_id + normalized unit
    // DB-backed items keep their (normalized) unit, even if empty; only
    // fallback ingredients_list items without a unit are counted in '份'
    const normalizedUnit = normalizeUnit(item.unit)
    const unit = normalizedUnit || (item.source === 'ingredients_list' ? '份' : '')
    const key = `${item.ingredient_id}:${unit}`
    
    // Keep raw quantity for aggregation
    // Display formatter will handle rounding at view layer
    const existing = map.get(key)
    if (existing) {
      // Unknown amounts add nothing; the sum stays null only if all are unknown
      if (qty !== null) existing.quantity = (existing.quantity ?? 0) + qty
    } else {
      map.set(key, {
        name: item.display_name || item.name, // Use display_name first
        quantity: qty,
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
  if (!unitLower) return ''
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
  
  // Unmapped units compare case-insensitively ('G' and 'g' are one unit)
  return unitMap[unitLower] || unitLower
}

/**
 * Group ingredients by category
 */
export function groupByCategory<T extends { category?: string }>(list: T[]): Record<string, T[]> {
  if (!list || !Array.isArray(list)) return {}
  
  const grouped: Record<string, T[]> = {}
  
  // Initialize with category order
  CATEGORY_ORDER.forEach(cat => {
    grouped[cat] = []
  })
  
  // Add 'other' category for unknowns
  grouped['other'] = []
  
  for (const item of list) {
    // Unknown categories go to 'other' rather than being dropped from the result
    const category = item.category && CATEGORY_ORDER.includes(item.category) ? item.category : 'other'
    grouped[category].push(item)
  }
  
  // Remove empty categories and sort
  const result: Record<string, T[]> = {}
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

interface ShoppingRecipeIngredient {
  ingredient_id?: string | null
  display_name?: string | null
  quantity?: unknown
  unit?: { name?: string | null } | null
  shopping_category?: string | null
  source?: string | null
}

interface ShoppingRecipe {
  base_servings?: number | null
  ingredients?: ShoppingRecipeIngredient[] | null
}

/**
 * Build shopping list from recipes and pantry
 * 1. Aggregate recipe ingredients
 * 2. Normalize ingredients
 * 3. Split into pantry vs toBuy
 * 4. Return structured result
 */
export function buildShoppingList(
  recipes: (ShoppingRecipe | null | undefined)[],
  pantryIngredients: string[] = [],
  servings: number = 1
): ShoppingListResult {
  
  // 1. Collect all ingredients from recipes
  const allIngredients: Ingredient[] = []
  
  for (const recipe of recipes) {
    if (!recipe || !recipe.ingredients) continue
    
    const scale = servingScale(servings, recipe.base_servings || 1)
    
    for (const ing of recipe.ingredients) {
      // New format: display_name, shopping_category, unit.name, source
      const name = ing.display_name
      if (!name) continue
      
      // Scale here; mergeIngredients validates the quantity
      const qty = ing.quantity == null ? null : Number(ing.quantity) * scale
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
  const pantryIds = new Set<string>()
  const toBuy: Ingredient[] = []
  
  for (const item of merged) {
    const normName = normalizeIngredientName(item.name)
    if (pantryNorm.has(normName)) {
      // One pantry entry per ingredient, even when it is listed in several units
      const pantryKey = item.ingredient_id || normName
      if (!pantryIds.has(pantryKey)) {
        pantryIds.add(pantryKey)
        pantry.push({ name: item.name })
      }
    } else {
      toBuy.push(item)
    }
  }
  
  
  return { pantry, toBuy }
}
