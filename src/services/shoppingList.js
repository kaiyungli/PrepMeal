/**
 * Shopping List Aggregation - Pure Business Logic
 * 
 * NO Supabase import - NO DB access
 * NO React - Pure functions only
 */

/**
 * Aggregate ingredient items with category grouping
 * 
 * @param {Array} items - Array of ingredient items with {name, quantity, unit, category}
 * @param {string[]} pantryIngredients - Array of pantry item names (for matching)
 * @returns {pantry: Array, toBuy: Object} - toBuy grouped by category
 */
export function aggregateIngredients(items, pantryIngredients = []) {
  if (!items || !items.length) {
    return { pantry: [], toBuy: {} };
  }

  const pantryLower = pantryIngredients.map(p => p.toLowerCase());
  
  // Normalize quantities by unit type
  const normalized = items.map(item => {
    let qty = item.quantity || 0;
    const unit = item.unit?.code || item.unit || '';
    
    if (unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'l') {
      qty = Math.round(qty);
    } else if (unit === 'tbsp' || unit === 'tsp') {
      qty = Math.round(qty * 2) / 2;
    } else {
      qty = Math.round(qty * 100) / 100;
    }
    
    return { ...item, quantity: qty };
  });

  // Aggregate by ingredient name + unit
  const aggregated = new Map();
  for (const item of normalized) {
    const key = `${item.name}:${item.unit?.code || item.unit || 'unit'}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity = (existing.quantity || 0) + (item.quantity || 0);
    } else {
      aggregated.set(key, { ...item });
    }
  }

  const result = Array.from(aggregated.values());
  
  // Split into pantry vs toBuy
  const pantry = result.filter(item => {
    const nameLower = (item.name || '').toLowerCase();
    return pantryLower.some(p => nameLower.includes(p) || p.includes(nameLower));
  });
  
  const toBuyRaw = result.filter(item => {
    const nameLower = (item.name || '').toLowerCase();
    return !pantryLower.some(p => nameLower.includes(p) || p.includes(nameLower));
  });

  // Group toBuy by category
  const toBuy = {};
  for (const item of toBuyRaw) {
    const category = item.category || 'other';
    if (!toBuy[category]) toBuy[category] = [];
    toBuy[category].push({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit?.name || item.unit || ''
    });
  }

  return {
    pantry: pantry.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit?.name || i.unit || '' })),
    toBuy
  };
}

/**
 * Build ingredient items from raw DB rows (called from API)
 */
export function buildIngredientItems(recipeIngredients, unitsMap, servings = 1) {
  const items = [];
  
  for (const ri of (recipeIngredients || [])) {
    const ing = ri.ingredients;
    if (!ing) continue;

    const unit = unitsMap.get(ri.unit_id);
    items.push({
      ingredient_id: ing.id,
      name: ing.name,
      slug: ing.slug,
      quantity: ri.quantity ? Number(ri.quantity) * servings : null,
      unit: unit ? { code: unit.code, name: unit.name } : null,
      category: ing.shopping_category || 'other'
    });
  }
  
  return items;
}
