/**
 * Fetch Generated Plan Shopping List Service
 * 
 * Aggregates shopping list from generated weekly plan.
 */
import { perfNow, perfLog } from '@/utils/perf';

export interface ShoppingListItem {
  name: string;
  quantity: number | string;
  unit: string;
  inPantry: boolean;
  category?: string;
}

/**
 * Fetch shopping list for generated plan
 * @param weeklyPlan - Current weekly plan { dayKey: [recipes] }
 * @param pantryIngredients - Pantry ingredients to exclude
 * @param servings - Servings multiplier
 * @param traceId - Optional trace ID for logging
 * @returns Shopping list items
 */
export async function fetchGeneratedPlanShoppingList(
  weeklyPlan: Record<string, any[]>,
  pantryIngredients: string[] = [],
  servings: number = 1,
  traceId?: string
): Promise<ShoppingListItem[]> {
  const preloadStart = perfNow();
  
  // Collect recipe IDs from plan
  const recipeIds: string[] = [];
  Object.values(weeklyPlan).forEach(recipes => {
    if (Array.isArray(recipes)) {
      recipes.forEach(r => {
        if (r?.id) recipeIds.push(String(r.id));
      });
    }
  });
  
  const recipeCount = recipeIds.length;
  
  if (recipeCount === 0) {
    return [];
  }
  
  // Log fetch start
  perfLog({
    traceId,
    event: 'shopping_list',
    stage: 'fetch_start',
    label: 'shopping_list.fetch.start',
    duration: 0,
    meta: { recipeCount, pantryCount: pantryIngredients.length, servings }
  });
  
  try {
    const fetchStart = perfNow();
    const res = await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeIds,
        pantryIngredients,
        servings
      })
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch shopping list');
    }
    
    const data = await res.json();
    const fetchEnd = perfNow();
    
    // Log fetch total
    perfLog({
      traceId,
      event: 'shopping_list',
      stage: 'fetch_total',
      label: 'shopping_list.fetch.total',
      start: fetchStart,
      end: fetchEnd,
      meta: { recipeCount, itemCount: data.toBuy?.length || 0 }
    });
    
    // Transform API response to flat list
    const toBuyGroups = data.toBuy || {};
    const flatToBuy: ShoppingListItem[] = [];
    Object.values(toBuyGroups).forEach((items) => {
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          flatToBuy.push({ ...item, inPantry: false });
        });
      }
    });
    
    const totalItems = (data.pantry?.length || 0) + flatToBuy.length;
    
    const list: ShoppingListItem[] = [
      ...(data.pantry || []).map((p: any) => ({ ...p, inPantry: true })),
      ...flatToBuy
    ];
    
    perfLog({
      traceId,
      event: 'shopping_list',
      stage: 'preload_total',
      label: 'shopping_list.preload_total',
      start: preloadStart,
      meta: { itemCount: totalItems }
    });
    
    return list;
  } catch (err) {
    perfLog({
      traceId,
      event: 'shopping_list',
      stage: 'fetch_error',
      label: 'shopping_list.fetch.error',
      start: preloadStart,
      meta: { recipeCount }
    });
    console.error('Error fetching shopping list:', err);
    throw err;
  }
}
