/**
 * Shopping List API
 * 
 * POST - Generate shopping list for a weekly plan
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { mapRawCategoryToKey } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse, ShoppingListSection, ShoppingListBuyItem, ShoppingCategoryKey } from '@/features/shopping-list/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShoppingListResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as Record<string, unknown>;
  const userId = String(body?.userId ?? '');
  const recipeIds = Array.isArray(body?.recipeIds) ? body.recipeIds as string[] : [];
  const pantryIngredients = Array.isArray(body?.pantryIngredients) ? body.pantryIngredients as string[] : [];
  const servings = typeof body?.servings === 'number' ? body.servings : 1;
  
  if (!userId || recipeIds.length === 0) {
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
    
    if (!recipeIngredients) {
      return res.status(200).json({
        pantry: [],
        toBuy: [],
        summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 }
      });
    }

    // 2. Fetch units
    const validIngredients = recipeIngredients.filter((i): boolean => Boolean(i && i.id && i.name));
    const unitIds = validIngredients.filter((i) => i.unit_id).map((i) => i.unit_id as string);
    const uniqueUnitIds = [...new Set(unitIds)];
    
    const { data: units } = uniqueUnitIds.length > 0
      ? await supabase.from('units').select('id, code, name').in('id', uniqueUnitIds)
      : { data: [] };
    
    const unitMap = new Map((units || []).map((u) => [u.id, u.code]));

    // 3. Aggregate by category using simple approach
    const categoryMap = new Map<ShoppingCategoryKey, ShoppingListBuyItem[]>();
    
    for (const ing of validIngredients) {
      if (!ing) continue;
      const cat = mapRawCategoryToKey(ing.category ?? null);
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      const item: ShoppingListBuyItem = {
        ingredientId: ing.id!,
        name: ing.name!,
        normalizedName: ing.name!,
        quantity: (ing.quantity ?? 0) * servings,
        unit: unitMap.get(ing.unit_id ?? '') ?? '',
        category: cat,
        source: 'recipe_ingredients',
        quantityPending: false,
      };
      categoryMap.get(cat)!.push(item);
    }

    // 4. Build sections
    const toBuy: ShoppingListSection[] = [];
    categoryMap.forEach((items, cat) => {
      toBuy.push({ category: cat, items });
    });

    // 5. Build pantry
    const pantry = pantryIngredients.map((name) => ({
      ingredientId: null,
      name: String(name),
      normalizedName: String(name),
      category: 'pantry' as ShoppingCategoryKey,
    }));

    // 6. Build summary
    const summary = {
      pantryCount: pantry.length,
      toBuyCount: toBuy.reduce((sum, s) => sum + s.items.length, 0),
      sectionCount: toBuy.length,
    };

    res.status(200).json({ pantry, toBuy, summary });
  } catch (error) {
    console.error('Shopping list error:', error);
    res.status(500).json({ error: (error as Error).message || 'Internal error' });
  }
}
