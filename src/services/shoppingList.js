import { supabase } from '@/lib/supabaseClient';

/**
 * Shopping List Aggregation Service
 * 
 * Pure business logic for aggregating shopping list from recipes.
 * No UI / React code here.
 */

/**
 * Aggregate shopping list from recipe IDs
 * 
 * @param {string[]} recipeIds - Array of recipe IDs
 * @param {string[]} pantryIngredients - Array of pantry item names (for matching)
 * @param {number} servings - Servings multiplier (default 1)
 * @returns {Promise<{pantry: Array, toBuy: Array}>}
 */
export async function aggregateShoppingList(recipeIds, pantryIngredients = [], servings = 1) {
  if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
    return { pantry: [], toBuy: [] };
  }

  // 1. Fetch all recipe_ingredients for these recipes in one query
  const { data: recipeIngredients, error: riError } = await supabase
    .from('recipe_ingredients')
    .select('quantity, unit_id, recipe_id, ingredients(id, name, slug, shopping_category)')
    .in('recipe_id', recipeIds);

  if (riError) throw riError;

  // 2. Get unique unit IDs and fetch in one query
  const unitIds = [...new Set(recipeIngredients?.map(ri => ri.unit_id).filter(Boolean) || [])];
  let unitsMap = new Map();
  if (unitIds.length > 0) {
    const { data: units } = await supabase
      .from('units')
      .select('id, code, name')
      .in('id', unitIds);
    unitsMap = new Map((units || []).map(u => [u.id, u]));
  }

  // 3. Build ingredient items with full metadata
  const items = [];
  for (const ri of (recipeIngredients || [])) {
    const ing = ri.ingredients;
    if (!ing) continue;

    const unit = unitsMap.get(ri.unit_id);
    items.push({
      ingredient_id: ing.id,
      name: ing.name,
      display_name: ing.name,
      slug: ing.slug,
      quantity: ri.quantity ? Number(ri.quantity) * servings : null,
      unit: unit ? { code: unit.code, name: unit.name } : null,
      category: ing.shopping_category || '其他',
      source: 'recipe_ingredients'
    });
  }

  // 4. Aggregate by ingredient_id + unit
  const aggregated = new Map();
  for (const item of items) {
    if (!item.ingredient_id || !item.name) continue;
    
    const unitCode = item.unit?.code || 'no_unit';
    const key = `${item.ingredient_id}:${unitCode}`;
    const existing = aggregated.get(key);
    const qty = item.quantity || 0;
    
    if (existing) {
      existing.quantity = (existing.quantity || 0) + qty;
    } else {
      aggregated.set(key, { ...item });
    }
  }

  // 5. Normalize quantities
  const normalized = Array.from(aggregated.values()).map(item => {
    let qty = item.quantity || 0;
    const unit = item.unit?.code || '';
    
    if (unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'l') {
      qty = Math.round(qty);
    } else if (unit === 'tbsp' || unit === 'tsp') {
      qty = Math.round(qty * 2) / 2;
    } else {
      qty = Math.round(qty * 100) / 100;
    }
    
    return { ...item, quantity: qty };
  });

  // 6. Match against pantry (case-insensitive)
  const pantryLower = pantryIngredients.map(p => p.toLowerCase());
  const withPantryStatus = normalized.map(item => {
    const nameLower = item.name?.toLowerCase() || '';
    const inPantry = pantryLower.some(p => nameLower.includes(p) || p.includes(nameLower));
    return { ...item, inPantry };
  });

  // 7. Split into pantry vs toBuy
  const pantry = withPantryStatus.filter(i => i.inPantry).map(i => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit?.name || ''
  }));

  const toBuy = withPantryStatus.filter(i => !i.inPantry).map(i => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit?.name || '',
    category: i.category
  }));

  return { pantry, toBuy };
}

/**
 * Get shopping list from full recipe data (alternative entry point)
 * Use this when you already have recipe data and don't want DB query
 * 
 * @param {Array} recipes - Array of recipe objects with ingredients
 * @param {string[]} pantryIngredients - Array of pantry item names
 * @returns {pantry: Array, toBuy: Array}
 */
export function aggregateFromRecipeData(recipes, pantryIngredients = []) {
  // This is a simplified version for when you have recipe data already
  // Similar logic but works with in-memory data
  if (!recipes || !recipes.length) {
    return { pantry: [], toBuy: [] };
  }

  const items = [];
  const pantryLower = pantryIngredients.map(p => p.toLowerCase());

  for (const recipe of recipes) {
    const recipeIngredients = recipe.ingredients || [];
    for (const ri of recipeIngredients) {
      const ing = ri.ingredient || ri.ingredients;
      if (!ing) continue;
      
      items.push({
        name: ing.name || ing.display_name,
        quantity: ri.quantity || 0,
        unit: ri.unit_name || ri.unit?.name || ''
      });
    }
  }

  // Simple aggregation by name (this is a fallback for offline/UI-only)
  const aggregated = new Map();
  for (const item of items) {
    const key = item.name;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      aggregated.set(key, { ...item });
    }
  }

  const normalized = Array.from(aggregated.values());
  const pantry = normalized.filter(i => 
    pantryLower.some(p => i.name.toLowerCase().includes(p))
  );
  const toBuy = normalized.filter(i => 
    !pantryLower.some(p => i.name.toLowerCase().includes(p))
  );

  return { pantry, toBuy };
}
