import { supabase } from '@/lib/supabaseClient';
import { aggregateIngredients, buildIngredientItems } from '@/services/shoppingList';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeIds, pantryIngredients = [], servings = 1 } = req.body;

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds is required' });
    }

    // 1. Fetch recipe_ingredients
    const { data: recipeIngredients, error: riError } = await supabase
      .from('recipe_ingredients')
      .select('quantity, unit_id, recipe_id, ingredients(id, name, slug, shopping_category)')
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

    // 3. Build items
    const items = buildIngredientItems(recipeIngredients, unitsMap, servings);

    // 4. Aggregate (grouped by category)
    const result = aggregateIngredients(items, pantryIngredients);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
