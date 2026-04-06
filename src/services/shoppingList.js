/**
 * Shopping List Aggregation - Pure Business Logic
 * 
 * NO Supabase import - NO DB access
 * NO React - Pure functions only
 */

import { normalizeCategory, CATEGORY_ORDER, CATEGORY_LABELS } from '@/constants/shoppingCategories';

/**
 * Normalize quantities by unit type
 */
function normalizeQuantity(qty, unit) {
  if (!unit) return Math.round(qty * 100) / 100;
  const unitCode = unit.code || unit || '';
  
  if (unitCode === 'g' || unitCode === 'ml' || unitCode === 'kg' || unitCode === 'l') {
    return Math.round(qty);
  } else if (unitCode === 'tbsp' || unitCode === 'tsp') {
    return Math.round(qty * 2) / 2;
  }
  return Math.round(qty * 100) / 100;
}

/**
 * Aggregate ingredients by name + unit
 */
function aggregateItems(items) {
  const aggregated = new Map();
  
  for (const item of items) {
    const key = `${item.name}:${item.unit?.code || item.unit || 'unit'}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity = (existing.quantity || 0) + (item.quantity || 0);
    } else {
      aggregated.set(key, { ...item });
    }
  }
  
  return Array.from(aggregated.values()).map(item => ({
    ...item,
    quantity: normalizeQuantity(item.quantity, item.unit)
  }));
}

/**
 * Build grouped by category structure
 */
function buildByCategory(items, pantryIngredients = []) {
  const pantryLower = pantryIngredients.map(p => p.toLowerCase());
  
  // Aggregate first
  const aggregated = aggregateItems(items);
  
  // Split pantry vs toBuy
  const pantry = aggregated.filter(item => {
    const nameLower = (item.name || '').toLowerCase();
    return pantryLower.some(p => nameLower.includes(p) || p.includes(nameLower));
  });
  
  const toBuyRaw = aggregated.filter(item => {
    const nameLower = (item.name || '').toLowerCase();
    return !pantryLower.some(p => nameLower.includes(p) || p.includes(nameLower));
  });

  // Group toBuy by category
  const toBuy = {};
  for (const item of toBuyRaw) {
    const category = normalizeCategory(item.category);
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
 * Build grouped by recipe structure
 */
function buildByRecipe(items, pantryIngredients = []) {
  const pantryLower = pantryIngredients.map(p => p.toLowerCase());
  
  // Group by recipe
  const byRecipeMap = new Map();
  
  for (const item of items) {
    const recipeId = item.recipe_id || 'unknown';
    const recipeName = item.recipe_name || '未知食譜';
    
    if (!byRecipeMap.has(recipeId)) {
      byRecipeMap.set(recipeId, { recipeId, recipeName, items: [] });
    }
    
    byRecipeMap.get(recipeId).items.push(item);
  }
  
  // Aggregate within each recipe and separate pantry
  const byRecipe = [];
  
  for (const [recipeId, group] of byRecipeMap) {
    const aggregated = aggregateItems(group.items);
    
    const pantry = aggregated.filter(item => {
      const nameLower = (item.name || '').toLowerCase();
      return pantryLower.some(p => nameLower.includes(p) || p.includes(nameLower));
    });
    
    const toBuy = aggregated.filter(item => {
      const nameLower = (item.name || '').toLowerCase();
      return !pantryLower.some(p => nameLower.includes(p) || p.includes(nameLower));
    });
    
    byRecipe.push({
      recipeId,
      recipeName: group.recipeName,
      pantry: pantry.map(i => ({ name: i.name })),
      toBuy: toBuy.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit?.name || i.unit || ''
      }))
    });
  }
  
  return byRecipe;
}

/**
 * Main aggregation function - returns both groupings
 */
export function aggregateIngredients(items, pantryIngredients = []) {
  if (!items || !items.length) {
    return { 
      pantry: [], 
      byCategory: { toBuy: {} },
      byRecipe: []
    };
  }

  const byCategory = buildByCategory(items, pantryIngredients);
  const byRecipe = buildByRecipe(items, pantryIngredients);

  return {
    pantry: byCategory.pantry,
    byCategory: { toBuy: byCategory.toBuy },
    byRecipe
  };
}

/**
 * Legacy export for backward compatibility
 */
export function buildIngredientItems(recipeIngredients, unitsMap, servings = 1) {
  // Deprecated - kept for compatibility
  return [];
}
