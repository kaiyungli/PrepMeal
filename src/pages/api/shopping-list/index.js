import { fetchRecipeIngredients } from '@/lib/shoppingListData';
import { aggregateIngredients } from '@/services/shoppingList';
import { perfNow, perfMeasure } from '@/utils/perf';

/**
 * Shopping List API
 * 
 * Uses server-side data access + pure aggregation service
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

    // 1. Fetch data via server-side helper
    const fetchStart = perfNow();
    const items = await fetchRecipeIngredients(recipeIds, servings);
    perfMeasure('api.shoppingList.fetchData', fetchStart);

    // 2. Aggregate using pure service
    const aggStart = perfNow();
    const result = aggregateIngredients(items, pantryIngredients);
    perfMeasure('api.shoppingList.aggregate', aggStart);

    perfMeasure('api.shoppingList.total', handlerStart);
    
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
