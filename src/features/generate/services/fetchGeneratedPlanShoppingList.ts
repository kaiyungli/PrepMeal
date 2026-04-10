/**
 * Fetch Generated Plan Shopping List Service
 * 
 * Aggregates shopping list from generated weekly plan.
 */
import { perfNow, perfMeasure } from '@/utils/perf';

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
 * @returns Shopping list items
 */
export async function fetchGeneratedPlanShoppingList(
  weeklyPlan: Record<string, any[]>,
  pantryIngredients: string[] = [],
  servings: number = 1
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
  
  if (recipeIds.length === 0) {
    return [];
  }
  
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
    perfMeasure('generate.shoppingList.fetch', fetchStart);
    
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
    
    const list: ShoppingListItem[] = [
      ...(data.pantry || []).map((p: any) => ({ ...p, inPantry: true })),
      ...flatToBuy
    ];
    
    perfMeasure('generate.preloadShoppingList.total', preloadStart);
    return list;
  } catch (err) {
    console.error('Error fetching shopping list:', err);
    throw err;
  }
}
