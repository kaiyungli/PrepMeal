/**
 * Shopping List Data Access Layer
 * 
 * This is the ONLY place allowed to fetch recipe_ingredients / units from Supabase.
 * Returns normalized ingredient rows ready for aggregation.
 */

import { supabase } from '@/lib/supabaseClient';
import { perfLog } from '@/utils/perf';

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

  const fetchStart = Date.now();

  // Single query with embedded relations
  const { data: recipeIngredients, error: riError } = await supabase
    .from('recipe_ingredients')
    .select(`
      quantity,
      unit_id,
      recipe_id,
      ingredients(id, name, slug, shopping_category),
      recipes(id, name),
      units(id, code, name)
    `)
    .in('recipe_id', recipeIds);

  if (riError) throw riError;

  // Build normalized items (units already embedded)
  const items = [];
  for (const ri of (recipeIngredients || [])) {
    const ing = ri.ingredients;
    const recipe = ri.recipes;
    const unitRow = ri.units; // Embedded from first query
    if (!ing) continue;

    items.push({
      ingredient_id: ing.id,
      name: ing.name,
      slug: ing.slug,
      quantity: ri.quantity ? Number(ri.quantity) * servings : null,
      unit: unitRow ? { code: unitRow.code, name: unitRow.name } : null,
      category: ing.shopping_category || null,
      recipe_id: recipe?.id || null,
      recipe_name: recipe?.name || '未知食譜'
    });
  }

  // Perf log
  perfLog({
    event: 'shopping_list',
    stage: 'db_fetch',
    label: 'shopping_list.db.fetch',
    duration: Date.now() - fetchStart,
    meta: { recipeCount: recipeIds.length }
  });

  return items;
}
