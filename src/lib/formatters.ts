// Display formatters for UI

// Unit display formatter
export function formatUnit(unit: string | undefined | null): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  const unitMap: Record<string, string> = {
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
    'l': 'l', 'liter': 'l', 'liters': 'l',
    'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'cup': 'cup', 'cups': 'cup',
    'pc': 'pc', 'piece': 'pc', 'pieces': 'pc', '個': 'pc'
  };
  return unitMap[u] || unit;
}

// Quantity formatter based on unit type
export function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined): string {
  if (quantity === null || quantity === undefined) return '-';
  
  const unitCode = unit?.toLowerCase() || '';
  let qty = quantity;
  
  // Round based on unit type
  if (unitCode === 'g' || unitCode === 'ml' || unitCode === 'kg' || unitCode === 'l') {
    qty = Math.round(qty);
  } else if (unitCode === 'tbsp' || unitCode === 'tsp') {
    qty = Math.round(qty * 2) / 2;
  } else {
    qty = Math.round(qty * 100) / 100;
  }
  
  return qty.toString();
}

// Format ingredient for display
export function formatIngredientDisplay(
  name: string,
  quantity: number | null | undefined,
  unit: string | null | undefined
): string {
  const qty = formatQuantity(quantity, unit);
  const u = formatUnit(unit);
  
  if (qty === '-' && !u) return name;
  if (!u) return `${name} ${qty}`;
  return `${name} ${qty} ${u}`;
}
