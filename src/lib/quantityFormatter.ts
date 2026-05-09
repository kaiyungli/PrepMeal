// Single source of truth for quantity display formatting
// Always uses Math.ceil for shopping list (round up)

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

function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const normalized = String(unit).toLowerCase().trim();
  return UNIT_ALIASES[normalized] || normalized;
}

export function formatQuantityForDisplay(quantity: number, unit: string | null | undefined): string {
  if (!quantity || !unit) return '';
  
  const qty = quantity;
  const normUnit = normalizeUnit(unit);
  
  // g/ml/kg/l - round up to integer
  if (MASS_UNITS.includes(normUnit) || VOLUME_UNITS.includes(normUnit)) {
    return Math.ceil(qty).toString();
  }
  
  // tbsp/tsp - round up to nearest 0.5
  if (normUnit === 'tbsp' || normUnit === 'tsp') {
    return (Math.ceil(qty * 2) / 2).toFixed(1);
  }
  
  // count units - round up to integer
  if (COUNT_UNITS.includes(normUnit)) {
    return Math.ceil(qty).toString();
  }
  
  // fallback: round up max 2 decimals
  return (Math.ceil(qty * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
}

export default formatQuantityForDisplay;
