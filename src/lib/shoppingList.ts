import { normalizeIngredients } from './ingredientNormalizer'

interface Ingredient {
  name: string
  quantity: number
  unit?: string
  category?: string
  baseServings?: number
  targetServings?: number
}

// Category order for display
const CATEGORY_ORDER = ['肉類', '海鮮', '蛋類', '豆腐', '蔬菜', '雜貨']

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
    // Skip invalid items
    if (!item || !item.name || typeof item.quantity !== 'number') continue
    
    // Apply scaling if provided
    let quantity = item.quantity
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
