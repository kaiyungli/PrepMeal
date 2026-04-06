import { aggregateShoppingList } from '@/services/shoppingList';
import { perfNow, perfMeasure } from '@/utils/perf';

export default async function handler(req, res) {
  const handlerStart = perfNow();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { recipeIds, pantryIngredients = [], servings = 1 } = req.body

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds is required' })
    }

    const start = perfNow();
    const result = await aggregateShoppingList(recipeIds, pantryIngredients, servings);
    perfMeasure('api.shoppingList.aggregate', start);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
