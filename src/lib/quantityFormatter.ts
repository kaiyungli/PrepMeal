// Single source of truth for quantity display formatting
// Always uses Math.ceil for shopping list (round up)

const COUNT_UNITS = ['pc', 'piece', 'clove', 'slice', 'stick', 'egg', 'cup', 'pack', 'bottle', 'can', 'bag', 'box'];
const VOLUME_UNIT = ['ml', 'l', 'cc'];
const MASS_UNITS = ['g', 'kg', 'gram'];

export function formatQuantityForDisplay(quantity: number, unit: string | null | undefined): string {
  if (!quantity || !unit) return '';
  
  const qty = quantity;
  
  // g/ml/kg/l - round up to integer
  if (MASS_UNITS.includes(unit) || VOLUME_UNIT.includes(unit)) {
    return Math.ceil(qty).toString();
  }
  
  // tbsp/tsp - round up to nearest 0.5
  if (unit === 'tbsp' || unit === 'tsp') {
    return (Math.ceil(qty * 2) / 2).toFixed(1);
  }
  
  // count units - round up to integer
  if (COUNT_UNITS.includes(unit)) {
    return Math.ceil(qty).toString();
  }
  
  // fallback: round up max 2 decimals
  return (Math.ceil(qty * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
}

export default formatQuantityForDisplay;
