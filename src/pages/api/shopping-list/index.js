import { fetchRecipeIngredients } from '@/lib/shoppingListData';
import { aggregateIngredients } from '@/services/shoppingList';

/**
 * Shopping List API
 * 
 * Architecture: API → Data Helper → Pure Service
 * - Data helper fetches from DB (supabase)
 * - Pure service aggregates and groups (no DB)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeIds, pantryIngredients = [], servings = 1 } = req.body;

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds is required' });
    }

    // 1. Fetch data via server-side helper (DB access)
    const items = await fetchRecipeIngredients(recipeIds, servings);

    // 2. Aggregate using pure service (no DB)
    const result = aggregateIngredients(items, pantryIngredients);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
