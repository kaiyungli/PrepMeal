import { supabase } from '@/lib/supabaseClient';
import { aggregateIngredients, buildIngredientItems } from '@/services/shoppingList';
import { perfNow, perfMeasure } from '@/utils/perf';

/**
 * Shopping List API
 * 
 * Data Access Layer:
 * 1. Fetch recipe_ingredients from DB
 * 2. Fetch units from DB
 * 3. Build normalized items using pure service
 * 4. Aggregate using pure service
 */

export default async function handler(req, res) {
  const handlerStart = perfNow();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeIds, pantryIngredients = [], servings = 1 } = req.body;

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds is required' });
    }

    // 1. Fetch recipe_ingredients with ingredient data
    const riStart = perfNow();
    const { data: recipeIngredients, error: riError } = await supabase
      .from('recipe_ingredients')
      .select('quantity, unit_id, recipe_id, ingredients(id, name, slug, shopping_category)')
      .in('recipe_id', recipeIds);
    perfMeasure('api.shoppingList.recipeIngredientsQuery', riStart);

    if (riError) throw riError;

    // 2. Fetch units
    const unitsStart = perfNow();
    const unitIds = [...new Set(recipeIngredients?.map(ri => ri.unit_id).filter(Boolean) || [])];
    let unitsMap = new Map();
    if (unitIds.length > 0) {
      const { data: units } = await supabase
        .from('units')
        .select('id, code, name')
        .in('id', unitIds);
      unitsMap = new Map((units || []).map(u => [u.id, u]));
    }
    perfMeasure('api.shoppingList.unitsQuery', unitsStart);

    // 3. Build items using pure service
    const buildStart = perfNow();
    const items = buildIngredientItems(recipeIngredients, unitsMap, servings);
    perfMeasure('api.shoppingList.buildItems', buildStart);

    // 4. Aggregate using pure service
    const aggStart = perfNow();
    const result = aggregateIngredients(items, pantryIngredients);
    perfMeasure('api.shoppingList.aggregate', aggStart);

    perfMeasure('api.shoppingList.total', handlerStart);
    
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
