/**
 * Fetch Generated Plan Shopping List Service
 * 
 * Uses new ShoppingListResponse format from API
 */
import type { ShoppingListViewModel } from '@/features/shopping-list/types';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';

export interface FetchShoppingListOptions {
  traceId?: string;
}

/**
 * Fetch shopping list for generated plan
 * @param weeklyPlan - Current weekly plan { dayKey: [recipes] }
 * @param pantryIngredients - Pantry ingredients to exclude
 * @param servings - Servings multiplier
 * @returns ShoppingListViewModel ready for UI
 */
export async function fetchGeneratedPlanShoppingList(
  weeklyPlan: Record<string, any[]>,
  pantryIngredients: string[] = [],
  servings: number = 1,
  options: FetchShoppingListOptions = {}
): Promise<ShoppingListViewModel> {
  const { traceId } = options;
  const preloadStart = performance.now();
  
  // Collect recipe IDs from plan
  const recipeIds: string[] = [];
  Object.values(weeklyPlan).forEach((recipes) => {
    if (Array.isArray(recipes)) {
      recipes.forEach((r) => {
        if (r?.id) recipeIds.push(String(r.id));
      });
    }
  });

  if (recipeIds.length === 0) {
    return {
      pantry: [],
      sections: [],
      summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
      isEmpty: true,
    };
  }

  try {
    const res = await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'current',
        recipeIds,
        pantryIngredients,
        servings,
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const response = await res.json();
    console.log('[ShoppingList] API response:', JSON.stringify(response).slice(0, 500));
    
    // Map API response to ViewModel using the new module
    const viewModel = mapShoppingListResponseToViewModel(response);
    
    return viewModel;
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    throw error;
  }
}
