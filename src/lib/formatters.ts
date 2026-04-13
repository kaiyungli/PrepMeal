// Display formatters for UI

// ============================================================================
// Unit Normalization - converts any unit input to canonical code
// ============================================================================

// Synonym normalization map - maps all variants to canonical codes
const UNIT_NORMALIZATION_MAP: Record<string, string> = {
  // Weight
  'g': 'g', 'gram': 'g', 'grams': 'g',
  'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
  // Volume
  'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
  'l': 'l', 'liter': 'l', 'liters': 'l',
  // Cooking measures
  'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
  'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
  'cup': 'cup', 'cups': 'cup',
  // Count
  'pc': 'pc', 'piece': 'pc', 'pieces': 'pc', '個': 'pc',
  'clove': 'clove', 'cloves': 'clove', '瓣': 'clove',
  'slice': 'slice', 'slices': 'slice', '片': 'slice',
  'pack': 'pack', 'packs': 'pack', '包': 'pack',
  'bunch': 'bunch', '束': 'bunch',
  'can': 'can', 'cans': 'can', '罐': 'can',
  'stick': 'stick', 'sticks': 'stick', '條': 'stick',
  'head': 'head', 'heads': 'head', '棵': 'head',
  'sheet': 'sheet', 'sheets': 'sheet', '張': 'sheet',
  'pinch': 'pinch', '撮': 'pinch'
};

// Chinese display labels for canonical units
const UNIT_DISPLAY: Record<string, string> = {
  // Weight
  'g': '克',
  'kg': '公斤',
  // Volume  
  'ml': '毫升',
  'l': '公升',
  // Cooking measures
  'tbsp': '湯匙',
  'tsp': '茶匙',
  'cup': '杯',
  // Count
  'pc': '個',
  'clove': '瓣',
  'slice': '片',
  'pack': '包',
  'bunch': '束',
  'can': '罐',
  'stick': '條',
  'head': '棵',
  'sheet': '張',
  'pinch': '撮'
};

/**
 * Normalize any unit input to canonical code
 * Supports: string, { name }, { code }
 */
export function normalizeUnitCode(unit: string | { name?: string; code?: string } | null | undefined): string {
  if (!unit) return '';
  
  // Extract raw value
  const raw = typeof unit === 'object'
    ? String(unit.code || unit.name || '').toLowerCase().trim()
    : String(unit).toLowerCase().trim();

  // Map to canonical code
  return UNIT_NORMALIZATION_MAP[raw] || raw;
}

/**
 * Format unit for display - returns Traditional Chinese label
 */
export function formatUnit(unit: string | { name?: string; code?: string } | null | undefined): string {
  if (!unit) return '';
  
  const code = normalizeUnitCode(unit);
  return UNIT_DISPLAY[code] || code;
}

// Backward compatibility - also export English short codes
export function formatUnitEnglish(unit: string | null | undefined): string {
  if (!unit) return '';
  const code = normalizeUnitCode(unit);
  const englishMap: Record<string, string> = {
    'g': 'g', 'kg': 'kg',
    'ml': 'ml', 'l': 'l',
    'tbsp': 'tbsp', 'tsp': 'tsp',
    'cup': 'cup', 'pc': 'pc',
    'clove': 'clove', 'slice': 'slice'
  };
  return englishMap[code] || code;
}

// ============================================================================
// Quantity formatting (unchanged)
// ============================================================================

export function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined): string {
  if (quantity === null || quantity === undefined) return '-';
  
  const unitCode = unit?.toLowerCase() || '';
  let qty = quantity;
  
  if (unitCode === 'g' || unitCode === 'ml' || unitCode === 'kg' || unitCode === 'l') {
    qty = Math.round(qty);
  } else if (unitCode === 'tbsp' || unitCode === 'tsp') {
    qty = Math.round(qty * 2) / 2;
  } else {
    qty = Math.round(qty * 100) / 100;
  }
  
  return qty.toString();
}

export function formatIngredientDisplay(
  name: string,
  quantity: number | null | undefined,
  unit: string | { name?: string; code?: string } | null | undefined
): string {
  const qty = formatQuantity(quantity, typeof unit === 'string' ? unit : unit?.name || unit?.code || undefined);
  const u = formatUnit(unit);
  
  if (qty === '-' && !u) return name;
  if (!u) return `${name} ${qty}`;
  return `${name} ${qty} ${u}`;
}
