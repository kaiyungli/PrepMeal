/**
 * Shopping List API
 * 
 * POST - Generate shopping list for a weekly plan
 * Optimized: single query with embedded relations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './user/_auth';
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

// Pantry input contains names, not ingredient IDs or quantities. Match whole
// names only; broad substring matches can incorrectly treat a different food
// (for example, sesame oil) as an item the user already has (plain oil).
const PANTRY_NAME_ALIASES: Record<string, string> = {
  egg: 'egg', eggs: 'egg', '蛋': 'egg', '雞蛋': 'egg', '鸡蛋': 'egg',
  tomato: 'tomato', tomatoes: 'tomato', '番茄': 'tomato', '蕃茄': 'tomato',
  tofu: 'tofu', '豆腐': 'tofu',
  onion: 'onion', '洋蔥': 'onion',
};

function pantryNameKey(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return Object.prototype.hasOwnProperty.call(PANTRY_NAME_ALIASES, normalized)
    ? PANTRY_NAME_ALIASES[normalized]
    : normalized;
}

// Merge rows only when both their identity AND normalized unit match, so an
// ingredient recorded under incompatible units (e.g. 2 tsp + 3 tbsp) is never
// raw-summed into one mathematically-invalid line. Aliases of the same unit
// (e.g. "gram" and "g") still merge, since both normalize to "g" first.
// Explicit `id:`/`name:` prefixes keep the two key spaces from ever colliding
// (an ingredientId could otherwise coincide with a `name` string).
function mergeItems(items: ShoppingListBuyItem[]): ShoppingListBuyItem[] {
  const map = new Map<string, ShoppingListBuyItem>();

  for (const item of items) {
    const normalizedUnit = normalizeUnit(item.unit);
    const key = item.ingredientId
      ? `id:${item.ingredientId}__${normalizedUnit}`
      : `name:${item.name}__${normalizedUnit}`;

    if (!map.has(key)) {
      map.set(key, { ...item, unit: normalizedUnit });
    } else {
      const existing = map.get(key)!;
      existing.quantity = (existing.quantity ?? 0) + (item.quantity ?? 0);
    }
  }

  return Array.from(map.values());
}

// recipe_ingredients.quantity has no CHECK constraint. A missing, negative or
// non-finite amount is an unknown amount and counts as 0 (as NULL always has),
// so it can never subtract from, or turn into NaN, another recipe's total.
function rowQuantity(raw: unknown): number {
  const quantity = raw === null || raw === undefined ? 0 : Number(raw);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

// recipes.id and recipe_ingredients.recipe_id are Postgres uuid columns, which
// accept upper case, surrounding braces and hyphens after any group of four
// hex digits, but always return the lower-case 8-4-4-4-12 form. Requested ids
// and returned rows are compared through this form so equivalent spellings are
// one recipe. Anything else is passed through unchanged.
function canonicalRecipeId(id: string): string {
  const braced = id.startsWith('{') && id.endsWith('}');
  const body = braced ? id.slice(1, -1) : id;
  if (!/^[0-9a-f]{4}(?:-?[0-9a-f]{4}){7}$/i.test(body)) return id;
  const hex = body.replace(/-/g, '').toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShoppingListResponse | { error: string }>
) {
  console.log('[shopping-list-api] handler hit');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await requireAuth(req, res);
  if (!userId) return;

  const body = req.body as Record<string, unknown>;
  // A plan can contain the same recipe more than once. Count occurrences so
  // each one contributes ingredients, but query the database by unique
  // canonical id.
  const recipeOccurrences = new Map<string, number>();
  if (Array.isArray(body?.recipeIds)) {
    for (const id of body.recipeIds) {
      if (typeof id === 'string' && id.trim() !== '') {
        const recipeId = canonicalRecipeId(id);
        recipeOccurrences.set(recipeId, (recipeOccurrences.get(recipeId) ?? 0) + 1);
      }
    }
  }
  const recipeIds = [...recipeOccurrences.keys()];
  const pantryIngredients = Array.isArray(body?.pantryIngredients)
    ? body.pantryIngredients
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter(Boolean)
    : [];
  const servings = typeof body?.servings === 'number' ? body.servings : 1;
  
  if (recipeIds.length === 0) {
    return res.status(400).json({ error: 'Missing recipeIds' });
  }
  if (recipeIds.length > 200) {
    return res.status(400).json({ error: 'Too many recipeIds' });
  }
  if (!Number.isFinite(servings) || servings <= 0) {
    return res.status(400).json({ error: 'Invalid servings' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Get user preference for unit language
  let unitLanguage = 'zh'; // default
  if (userId) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('unit_language')
      .eq('user_id', userId)
      .single();
    if (prefs?.unit_language) {
      unitLanguage = prefs.unit_language;
    }
  }
  console.log('[shopping-list api] user unit_language:', unitLanguage);

  try {
    // The service-role client bypasses RLS, so recipe visibility must be
    // enforced explicitly before related ingredient rows are queried.
    const { data: visibleRecipes, error: visibilityError } = await supabase
      .from('recipes')
      .select('id')
      .in('id', recipeIds)
      .eq('is_public', true);

    if (visibilityError) throw visibilityError;

    // A saved plan keeps its recipe ids after a recipe is unpublished or
    // removed. Those meals are skipped, private and missing alike, and only
    // their number is reported: unavailableRecipeCount counts meal
    // occurrences, never ids or names. Ingredients are queried for visible
    // recipes only.
    const returnedIds = new Set((visibleRecipes || []).map((recipe) => canonicalRecipeId(String(recipe.id))));
    const visibleOccurrences = new Map<string, number>();
    let unavailableRecipeCount = 0;
    for (const [id, count] of recipeOccurrences) {
      if (returnedIds.has(id)) {
        visibleOccurrences.set(id, count);
      } else {
        unavailableRecipeCount += count;
      }
    }
    const visibleRecipeIds = [...visibleOccurrences.keys()];

    if (visibleRecipeIds.length === 0) {
      return res.status(200).json({
        pantry: [],
        toBuy: [],
        byRecipe: [],
        summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
        unavailableRecipeCount,
      });
    }

    const dbStart = performance.now();
    console.log('[shopping-list-api] db fetch start', { recipeCount: visibleRecipeIds.length });
    
    // SINGLE query with embedded relations
    const { data: recipeIngredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select(`
        quantity,
        recipe_id,
        ingredient_id,
        ingredients(id, name, shopping_category),
        recipes(id, name),
        units(id, code, display_name_en, display_name_zh)
      `)
      .in('recipe_id', visibleRecipeIds);

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
      meta: { recipeCount: visibleRecipeIds.length },
    });
    
    console.log('[shopping-list api] fetched ri rows:', recipeIngredients?.length ?? 0);
    
    if (!recipeIngredients || recipeIngredients.length === 0) {
      console.log('[shopping-list api] no ingredients found');
      return res.status(200).json({
        pantry: [],
        toBuy: [],
        byRecipe: [],
        summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
        unavailableRecipeCount,
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

      const occurrences = visibleOccurrences.get(canonicalRecipeId(String(ri.recipe_id)));
      if (occurrences === undefined) {
        throw new Error('Ingredient row does not belong to a visible requested recipe');
      }
      
      // Choose display name based on user preference with proper fallback
      const unitCode = unitRow?.code ?? '';
      let unitDisplay = '';
      if (unitLanguage === 'en') {
        // English: prefer en, fallback to zh, then code
        unitDisplay = unitRow?.display_name_en || unitRow?.display_name_zh || unitCode;
      } else {
        // Chinese (default): prefer zh, fallback to en, then code
        unitDisplay = unitRow?.display_name_zh || unitRow?.display_name_en || unitCode;
      }
      
      allItems.push({
        ingredientId: ri.ingredient_id,
        name: ing.name,
        normalizedName: ing.name,
        // Scale by servings (quantities are per base serving; base_servings is
        // 1 across the catalogue) and by how often the recipe is in the plan.
        quantity: rowQuantity(ri.quantity) * servings * occurrences,
        unit: unitCode,
        unitDisplay: unitDisplay,
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

    const pantryNames = new Set(pantryIngredients.map(pantryNameKey).filter(Boolean));
    const isInPantry = (item: ShoppingListBuyItem) => pantryNames.has(pantryNameKey(item.name));
    const pantryIdentityKey = (item: ShoppingListBuyItem) => item.ingredientId
      ? `id:${item.ingredientId}`
      : `name:${pantryNameKey(item.name)}`;

    // Report only planned ingredients actually covered by the user's pantry.
    // Different units for the same ingredient are one pantry item, while all
    // their quantities remain excluded from the buy lists.
    const pantry = [...new Map(mergedItems.filter(isInPantry).map(item => [
      pantryIdentityKey(item),
      {
        ingredientId: item.ingredientId,
        name: item.name,
        normalizedName: pantryNameKey(item.name),
        category: 'pantry' as ShoppingCategoryKey,
      },
    ])).values()];

    // Group by category
    const categoryMap = new Map<ShoppingCategoryKey, ShoppingListBuyItem[]>();
    
    for (const item of mergedItems) {
      if (isInPantry(item)) continue;
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

    // Build byRecipe from allItems (before merge to keep recipe tracking)
    const recipeGroups = new Map<string, { recipeId: string; recipeName: string; items: ShoppingListBuyItem[] }>();
    
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
    const byRecipe: ShoppingListRecipeGroup[] = [];
    for (const [, group] of recipeGroups) {
      const mergedInRecipe = mergeItems(group.items);
      const pantryInRecipe = mergedInRecipe.filter(isInPantry);
      byRecipe.push({
        recipeId: group.recipeId,
        recipeName: group.recipeName,
        pantry: [...new Map(pantryInRecipe.map(item => [pantryIdentityKey(item), {
          ingredientId: item.ingredientId,
          name: item.name,
        }])).values()],
        toBuy: mergedInRecipe.filter(item => !isInPantry(item)).map(item => ({
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unitDisplay || item.unit || '',
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

    res.status(200).json({ pantry, toBuy, byRecipe, summary, unavailableRecipeCount });
  } catch (err) {
    // Database and internal error details stay in the server log.
    console.error('[shopping-list api] fatal error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
