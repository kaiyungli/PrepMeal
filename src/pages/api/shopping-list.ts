/**
 * Shopping List API
 * 
 * POST - Generate shopping list for a weekly plan
 * Optimized: single query with embedded relations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { mapRawCategoryToKey } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse, ShoppingListSection, ShoppingListBuyItem, ShoppingCategoryKey, ShoppingListRecipeGroup } from '@/features/shopping-list/types';
import { perfLog } from '@/utils/perf';

// Unit normalization
function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  const map: Record<string, string> = {
    'teaspoon': 'tsp', 'tsp': 'tsp',
    'tablespoon': 'tbsp', 'tbsp': 'tbsp',
    'milliliter': 'ml', 'ml': 'ml',
    'liter': 'l', 'l': 'l',
    'gram': 'g', 'g': 'g',
    'kilogram': 'kg', 'kg': 'kg',
    'cup': 'cup',
    'piece': '件',
  };
  return map[u] || unit;
}

// Merge with old behavior
function mergeItems(items: ShoppingListBuyItem[]): ShoppingListBuyItem[] {
  const map = new Map<string, ShoppingListBuyItem>();

  for (const item of items) {
    const normalizedUnit = normalizeUnit(item.unit);
    const key = item.ingredientId 
      ? String(item.ingredientId) 
      : `${item.name}__${normalizedUnit}`;

    if (!map.has(key)) {
      map.set(key, { ...item, unit: normalizedUnit });
    } else {
      const existing = map.get(key)!;
      existing.quantity = (existing.quantity ?? 0) + (item.quantity ?? 0);
    }
  }

  return Array.from(map.values());
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShoppingListResponse | { error: string }>
) {
  console.log('[shopping-list-api] handler hit');
  
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
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const dbStart = performance.now();
    console.log('[shopping-list-api] db fetch start', { recipeCount: recipeIds.length });
    
    // SINGLE query with embedded relations
    const { data: recipeIngredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select(`
        quantity,
        recipe_id,
        ingredient_id,
        ingredients(id, name, shopping_category),
        recipes(id, name),
        units(id, code, name)
      `)
      .in('recipe_id', recipeIds);

    if (ingError) {
      console.log('[shopping-list api] fetch error:', ingError);
      throw ingError;
    }
    
    // DB timing log
    perfLog({
      event: 'shopping_list',
      stage: 'db_fetch',
      label: 'shopping_list.db.fetch',
      start: dbStart,
      meta: { recipeCount: recipeIds.length },
    });
    
    console.log('[shopping-list api] fetched ri rows:', recipeIngredients?.length ?? 0);
    
    if (!recipeIngredients || recipeIngredients.length === 0) {
      console.log('[shopping-list api] no ingredients found');
      return res.status(200).json({
        pantry: [],
        toBuy: [],
        byRecipe: [],
        summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 }
      });
    }

    console.log('[shopping-list api] building items');
    const allItems: ShoppingListBuyItem[] = [];
    
    for (const ri of recipeIngredients) {
      if (!ri || !ri.ingredient_id) continue;
      
      const ing = Array.isArray(ri.ingredients) ? ri.ingredients[0] : (ri.ingredients || null);
      const recipe = Array.isArray(ri.recipes) ? ri.recipes[0] : (ri.recipes || null);
      const unitRow = Array.isArray(ri.units) ? ri.units[0] : (ri.units || null);
      if (!ing || !ing.name) continue;
      
      allItems.push({
        ingredientId: ri.ingredient_id,
        name: ing.name,
        normalizedName: ing.name,
        quantity: (ri.quantity ?? 0) * servings,
        unit: unitRow?.code ?? '',
        category: mapRawCategoryToKey(ing.shopping_category ?? null),
        source: 'recipe_ingredients',
        quantityPending: false,
        recipeId: ri.recipe_id,
        recipeName: recipe?.name || 'Unknown',
      });
    }

    console.log('[shopping-list api] items before merge:', allItems.length);
    console.log('[shopping-list api] first item sample:', allItems[0] || null);
    
    const mergedItems = mergeItems(allItems);
    console.log('[shopping-list api] items after merge:', mergedItems.length);

    // Group by category
    const categoryMap = new Map<ShoppingCategoryKey, ShoppingListBuyItem[]>();
    
    for (const item of mergedItems) {
      const cat = item.category;
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      const arr = categoryMap.get(cat)!;
      arr.push(item);
      categoryMap.set(cat, mergeItems(arr));
    }

    console.log('[shopping-list api] categoryMap keys:', Array.from(categoryMap.keys()));

    const toBuy: ShoppingListSection[] = [];
    categoryMap.forEach((items, cat) => {
      toBuy.push({ category: cat, items });
    });

    console.log('[shopping-list api] toBuy sections:', toBuy.length);

    const pantry = pantryIngredients.map((name) => ({
      ingredientId: null,
      name: String(name),
      normalizedName: String(name),
      category: 'pantry' as ShoppingCategoryKey,
    }));

    // Build byRecipe from allItems (before merge to keep recipe tracking)
    const recipeGroups = new Map<string, { recipeId: string; recipeName: string; items: any[] }>();
    
    for (const item of allItems) {
      const rid = item.recipeId || 'unknown';
      if (!recipeGroups.has(rid)) {
        recipeGroups.set(rid, { 
          recipeId: rid, 
          recipeName: item.recipeName || 'Unknown',
          items: [] 
        });
      }
      recipeGroups.get(rid)!.items.push(item);
    }
    
    // Merge items within each recipe group
    const byRecipe: any[] = [];
    for (const [, group] of recipeGroups) {
      const mergedInRecipe = mergeItems(group.items);
      byRecipe.push({
        recipeId: group.recipeId,
        recipeName: group.recipeName,
        pantry: [],
        toBuy: mergedInRecipe.map(item => ({
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          quantityPending: item.quantityPending,
        })),
      });
    }

    const summary = {
      pantryCount: pantry.length,
      toBuyCount: toBuy.reduce((sum, s) => sum + s.items.length, 0),
      sectionCount: toBuy.length,
    };

    console.log('[shopping-list api] summary:', summary);
    console.log('[shopping-list api] byRecipe count:', byRecipe.length);
    console.log('[shopping-list api] returning response');

    res.status(200).json({ pantry, toBuy, byRecipe, summary });
  } catch (err) {
    console.error('[shopping-list api] fatal error:', err);
    res.status(500).json({ 
      error: err instanceof Error ? err.message : 'Internal error' 
    });
  }
}
