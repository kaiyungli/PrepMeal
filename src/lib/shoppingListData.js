/**
 * Shopping List Data Access Layer
 * 
 * This is the ONLY place allowed to fetch recipe_ingredients / units from Supabase.
 * Returns normalized ingredient rows ready for aggregation.
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Fetch and build ingredient items from recipe IDs
 * 
 * @param {string[]} recipeIds - Array of recipe IDs
 * @param {number} servings - Servings multiplier
 * @returns {Promise<Array>} - Normalized ingredient items ready for aggregation
 */
export async function fetchRecipeIngredients(recipeIds, servings = 1) {
  if (!recipeIds || !recipeIds.length) {
    return [];
  }

  // 1. Fetch recipe_ingredients with ingredient + recipe data
  const { data: recipeIngredients, error: riError } = await supabase
    .from('recipe_ingredients')
    .select('quantity, unit_id, recipe_id, ingredients(id, name, slug, shopping_category), recipes(id, name)')
    .in('recipe_id', recipeIds);

  if (riError) throw riError;

  // 2. Fetch units
  const unitIds = [...new Set(recipeIngredients?.map(ri => ri.unit_id).filter(Boolean) || [])];
  let unitsMap = new Map();
  if (unitIds.length > 0) {
    const { data: units } = await supabase
      .from('units')
      .select('id, code, name')
      .in('id', unitIds);
    unitsMap = new Map((units || []).map(u => [u.id, u]));
  }

  // 3. Build normalized items with recipe info
  const items = [];
  for (const ri of (recipeIngredients || [])) {
    const ing = ri.ingredients;
    const recipe = ri.recipes;
    if (!ing) continue;

    const unit = unitsMap.get(ri.unit_id);
    items.push({
      ingredient_id: ing.id,
      name: ing.name,
      slug: ing.slug,
      quantity: ri.quantity ? Number(ri.quantity) * servings : null,
      unit: unit ? { code: unit.code, name: unit.name } : null,
      category: ing.shopping_category || null,
      recipe_id: recipe?.id || null,
      recipe_name: recipe?.name || '未知食譜'
    });
  }

  return items;
}
