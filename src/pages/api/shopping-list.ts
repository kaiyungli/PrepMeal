/**
 * Shopping List API
 * 
 * POST - Generate shopping list for a weekly plan
 */

import { createClient } from '@supabase/supabase-js';
import { mapRawCategoryToKey } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse, ShoppingListSection } from '@/features/shopping-list/types';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, recipeIds, pantryIngredients = [], servings = 1 } = req.body;
  
  if (!userId || !Array.isArray(recipeIds) || recipeIds.length === 0) {
    return res.status(400).json({ error: 'Missing userId or recipeIds' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. Fetch recipe ingredients
    const { data: recipeIngredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select('id, name, category, recipe_id, unit_id, quantity')
      .in('recipe_id', recipeIds);
    
    if (ingError) throw ingError;

    // 2. Fetch units for mapping
    const unitIds = [...new Set(recipeIngredients?.filter((i) => i.unit_id).map((i) => i.unit_id))];
    const { data: units } = unitIds.length > 0
      ? await supabase.from('units').select('id, code, name').in('id', unitIds)
      : { data: [] };
    
    const unitMap = new Map((units || []).map((u) => [u.id, u.code]));

    // 3. Aggregate by category
    const categoryMap = new Map();
    
    for (const ing of recipeIngredients || []) {
      const category = mapRawCategoryToKey(ing.category);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      
      categoryMap.get(category).push({
        ingredientId: ing.id,
        name: ing.name,
        normalizedName: ing.name,
        quantity: (ing.quantity || 0) * servings,
        unit: unitMap.get(ing.unit_id) || '',
        category,
        source: 'recipe_ingredients',
        quantityPending: false,
      });
    }

    // 4. Build sections
    const sections: ShoppingListSection[] = Array.from(categoryMap.entries()).map(
      ([category, items]) => ({
        category,
        items,
      })
    );

    // 5. Build pantry (ingredients to exclude)
    const pantry = pantryIngredients.map((name) => ({
      ingredientId: null,
      name,
      normalizedName: name,
      category: 'pantry',
    }));

    // 6. Build summary
    const toBuyCount = sections.reduce((sum, s) => sum + s.items.length, 0);
    const summary = {
      pantryCount: pantry.length,
      toBuyCount,
      sectionCount: sections.length,
    };

    const response: ShoppingListResponse = {
      pantry,
      toBuy: sections,
      summary,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Shopping list error:', error);
    res.status(500).json({ error: error.message || 'Internal error' });
  }
}
