// Display formatters for UI

// ============================================================================
// Unit Normalization - converts any unit input to canonical code
// ============================================================================

// Canonical unit codes (internal representation)
const UNIT_CODES = [
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'ml', 'milliliter', 'milliliters',
  'l', 'liter', 'liters',
  'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons',
  'cup', 'cups',
  'pc', 'piece', 'pieces', '個',
  'clove', 'cloves', '瓣',
  'slice', 'slices', '片',
  'pack', 'packs', '包',
  'bunch', '束',
  'can', 'cans', '罐',
  'stick', 'sticks', '條',
  'head', 'heads', '棵',
  'sheet', 'sheets', '張',
  'pinch', '撮'
];

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
  
  // Handle object input
  if (typeof unit === 'object') {
    const code = unit.code || unit.name || '';
    return code.toLowerCase().trim();
  }
  
  // Handle string input
  return String(unit).toLowerCase().trim();
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
