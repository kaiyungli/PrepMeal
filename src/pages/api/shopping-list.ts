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
  console.log('[shopping-list api] start');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as Record<string, unknown>;
  const userId = String(body?.userId ?? '');
  const recipeIds = Array.isArray(body?.recipeIds) ? body.recipeIds as string[] : [];
  const pantryIngredients = Array.isArray(body?.pantryIngredients) ? body.pantryIngredients as string[] : [];
  const servings = typeof body?.servings === 'number' ? body.servings : 1;
  
  console.log('[shopping-list api] params:', { userId, recipeIds: recipeIds.length, pantryIngredients: pantryIngredients.length, servings });
  
  if (!userId || recipeIds.length === 0) {
    return res.status(400).json({ error: 'Missing userId or recipeIds' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Use a direct join query via the API
    console.log('[shopping-list api] fetching with ingredients join for:', recipeIds);
    
    const { data: recipeIngredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select('id, recipe_id, unit_id, quantity, ingredient_id')
      .in('recipe_id', recipeIds);
    
    if (ingError) {
      console.log('[shopping-list api] fetch error:', ingError);
      throw ingError;
    }
    
    console.log('[shopping-list api] fetched ri rows:', recipeIngredients?.length ?? 0);
    
    if (!recipeIngredients || recipeIngredients.length === 0) {
      console.log('[shopping-list api] no ingredients found');
      return res.status(200).json({
        pantry: [],
        toBuy: [],
        summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 }
      });
    }

    // Get unique ingredient IDs
    const ingredientIds = recipeIngredients
      .filter((ri) => ri.ingredient_id)
      .map((ri) => ri.ingredient_id as string);
    const uniqueIngredientIds = [...new Set(ingredientIds)];
    
    console.log('[shopping-list api] fetching ingredients:', uniqueIngredientIds.length);
    
    // Fetch the actual ingredient details
    const { data: ingredientsData, error: ingDetailsError } = await supabase
      .from('ingredients')
      .select('id, name, category')
      .in('id', uniqueIngredientIds);
    
    if (ingDetailsError) {
      console.log('[shopping-list api] ingredients fetch error:', ingDetailsError);
      throw ingDetailsError;
    }
    
    // Build lookup map
    const ingredientMap = new Map((ingredientsData || []).map((i) => [i.id, i]));
    
    // Fetch units
    const unitIds = recipeIngredients
      .filter((ri) => ri.unit_id)
      .map((ri) => ri.unit_id as string);
    const uniqueUnitIds = [...new Set(unitIds)];
    
    console.log('[shopping-list api] fetching units:', uniqueUnitIds.length);
    
    const { data: units } = uniqueUnitIds.length > 0
      ? await supabase.from('units').select('id, code, name').in('id', uniqueUnitIds)
      : { data: [] };
    
    const unitMap = new Map((units || []).map((u) => [u.id, u.code]));
    console.log('[shopping-list api] unitMap size:', unitMap.size);

    // Aggregate by category using lookup
    console.log('[shopping-list api] aggregating by category');
    const categoryMap = new Map<ShoppingCategoryKey, ShoppingListBuyItem[]>();
    
    for (const ri of recipeIngredients) {
      if (!ri || !ri.ingredient_id) continue;
      
      const ingData = ingredientMap.get(ri.ingredient_id);
      if (!ingData || !ingData.name) continue;
      
      const cat = mapRawCategoryToKey(ingData.category ?? null);
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      
      const item: ShoppingListBuyItem = {
        ingredientId: ri.ingredient_id,
        name: ingData.name,
        normalizedName: ingData.name,
        quantity: (ri.quantity ?? 0) * servings,
        unit: unitMap.get(ri.unit_id ?? '') ?? '',
        category: cat,
        source: 'recipe_ingredients',
        quantityPending: false,
      };
      categoryMap.get(cat)!.push(item);
    }

    console.log('[shopping-list api] categoryMap keys:', Array.from(categoryMap.keys()));

    // Build sections
    const toBuy: ShoppingListSection[] = [];
    categoryMap.forEach((items, cat) => {
      toBuy.push({ category: cat, items });
    });

    console.log('[shopping-list api] toBuy sections:', toBuy.length);

    // Build pantry
    const pantry = pantryIngredients.map((name) => ({
      ingredientId: null,
      name: String(name),
      normalizedName: String(name),
      category: 'pantry' as ShoppingCategoryKey,
    }));

    // Build summary
    const summary = {
      pantryCount: pantry.length,
      toBuyCount: toBuy.reduce((sum, s) => sum + s.items.length, 0),
      sectionCount: toBuy.length,
    };

    console.log('[shopping-list api] summary:', summary);
    console.log('[shopping-list api] returning response');

    res.status(200).json({ pantry, toBuy, summary });
  } catch (err) {
    console.error('[shopping-list api] fatal error:', err);
    res.status(500).json({ 
      error: err instanceof Error ? err.message : 'Internal error' 
    });
  }
}
