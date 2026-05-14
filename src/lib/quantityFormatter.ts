// Single source of truth for quantity display formatting
// Supports fractions, rounding, and unit-based rules

const UNIT_ALIASES: Record<string, string> = {
  // Mass
  '克': 'g', 'g': 'g', 'gram': 'g', 'grams': 'g', '千克': 'kg', 'kg': 'kg',
  // Volume  
  '毫升': 'ml', 'ml': 'ml', '公升': 'l', 'l': 'l', 'cc': 'ml',
  // Count
  '件': 'pc', '個': 'pc', 'pc': 'pc', 'piece': 'pc', 'pieces': 'pc',
  '瓣': 'clove', 'clove': 'clove',
  '片': 'slice', 'slice': 'slice',
  '條': 'stick', 'stick': 'stick',
  '隻': 'egg', 'egg': 'egg',
  '杯': 'cup', 'cup': 'cup',
  '包': 'pack', 'pack': 'pack',
  '瓶': 'bottle', 'bottle': 'bottle',
  '罐': 'can', 'can': 'can',
  '袋': 'bag', 'bag': 'bag',
  '盒': 'box', 'box': 'box',
};

const COUNT_UNITS = ['pc', 'piece', 'clove', 'slice', 'stick', 'egg', 'cup', 'pack', 'bottle', 'can', 'bag', 'box'];
const VOLUME_UNITS = ['ml', 'l', 'cc'];
const MASS_UNITS = ['g', 'kg', 'gram'];
const FRACTION_UNITS = ['tbsp', 'tsp', '湯匙', '茶匙', 'tbsppoon', 'tsppoon'];

function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const normalized = String(unit).toLowerCase().trim();
  return UNIT_ALIASES[normalized] || normalized;
}

// Fraction map with tolerance
const FRACTIONS: Record<number, string> = {
  0.3333333333333333: '1/3',
  0.6666666666666666: '2/3',
  0.5: '1/2',
  0.25: '1/4',
  0.75: '3/4',
  0.125: '1/8',
  0.375: '3/8',
  0.625: '5/8',
  0.875: '7/8',
};

function findFraction(q: number): string | null {
  const tolerance = 0.02;
  // Check for whole number + fraction
  const whole = Math.floor(q);
  const frac = q - whole;
  
  for (const [key, label] of Object.entries(FRACTIONS)) {
    if (Math.abs(frac - Number(key)) < tolerance) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }
  return null;
}

export function formatQuantityForDisplay(quantity: number, unit: string | null | undefined): string {
  if (!quantity || !unit) return '';
  
  const qty = quantity;
  const normUnit = normalizeUnit(unit);
  
  // g/ml/kg/l - round up to integer
  if (MASS_UNITS.includes(normUnit) || VOLUME_UNITS.includes(normUnit)) {
    return Math.ceil(qty).toString();
  }
  
  // tbsp/tsp - try fraction first, else round up to nearest 0.5
  if (FRACTION_UNITS.includes(normUnit)) {
    const frac = findFraction(qty);
    if (frac) return frac;
    return (Math.ceil(qty * 2) / 2).toFixed(1).replace(/\.0$/, '');
  }
  
  // count units - round up to integer
  if (COUNT_UNITS.includes(normUnit)) {
    return Math.ceil(qty).toString();
  }
  
  // fallback: try fraction, else round up max 2 decimals
  const frac = findFraction(qty);
  if (frac) return frac;
  
  return (Math.ceil(qty * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
}

export default formatQuantityForDisplay;
