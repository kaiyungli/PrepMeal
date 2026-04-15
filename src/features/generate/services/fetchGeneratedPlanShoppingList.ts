/**
 * Fetch Generated Plan Shopping List Service
 * 
 * Uses new ShoppingListResponse format from API
 */
import type { ShoppingListViewModel } from '@/features/shopping-list/types';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import { perfNow, perfLog } from '@/utils/perf';

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
  const t0 = perfNow();
  
  // Collect recipe IDs from plan
  const recipeIds: string[] = [];
  Object.values(weeklyPlan).forEach((recipes) => {
    if (Array.isArray(recipes)) {
      recipes.forEach((r) => {
        if (r?.id) recipeIds.push(String(r.id));
      });
    }
  });

  perfLog({
    event: 'shopping_list',
    stage: 'fetch_start',
    label: 'shopping_list.fetch.start',
    duration: 0,
    meta: {
      recipeCount: recipeIds.length,
      pantryCount: pantryIngredients.length,
      servings,
    },
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
    const fetchStart = perfNow();
    
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
      let errorText = `API error: ${res.status}`;
      try {
        const errorBody = await res.text();
        if (errorBody) errorText += ` - ${errorBody}`;
      } catch {}
      throw new Error(errorText);
    }

    const response = await res.json();
    const fetchDuration = perfNow() - fetchStart;
    
    // Map to ViewModel
    const mapStart = perfNow();
    const viewModel = mapShoppingListResponseToViewModel(response);
    const mapDuration = perfNow() - mapStart;
    
    // Log fetch_total
    perfLog({
      event: 'shopping_list',
      stage: 'fetch_total',
      label: 'shopping_list.fetch.total',
      duration: fetchDuration,
      meta: {
        recipeCount: recipeIds.length,
        pantryCount: viewModel.summary?.pantryCount || 0,
        toBuyCount: viewModel.summary?.toBuyCount || 0,
        sectionCount: viewModel.summary?.sectionCount || 0,
      },
    });
    
    // Log map_total
    perfLog({
      event: 'shopping_list',
      stage: 'map_total',
      label: 'shopping_list.map.total',
      duration: mapDuration,
    });
    
    return viewModel;
  } catch (error) {
    const duration = perfNow() - t0;
    perfLog({
      event: 'shopping_list',
      stage: 'fetch_error',
      label: 'shopping_list.fetch.error',
      duration,
      meta: {
        recipeCount: recipeIds.length,
        message: (error as Error).message,
      },
    });
    throw error;
  }
}
