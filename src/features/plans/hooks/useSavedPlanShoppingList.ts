import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const SHOPPING_LIST_LOAD_ERROR = '購物清單載入失敗，請重試';
const SIGN_IN_REQUIRED = '請先登入以查看購物清單';

// The shape ShoppingListDrawer renders.
export interface SavedPlanShoppingList {
  byCategory: { pantry: unknown[]; toBuy: Record<string, unknown[]> };
  byRecipe: Array<{ recipeName: string; pantry: unknown[]; toBuy: unknown[] }>;
  notice: string | null;
  noUsableRecipes: boolean;
}

interface UseSavedPlanShoppingListOptions {
  recipeIds: string[];
  servings: number;
}

/**
 * Loads a saved plan's shopping list from /api/shopping-list and maps it to
 * the ShoppingListDrawer shape.
 *
 * A failed request (HTTP error, unreadable body, network failure) ends in
 * `error` with a fixed message and no list, so the drawer never shows a blank
 * panel, an earlier result, or backend error text. Only one request runs at a
 * time; calling fetchShoppingList while one is pending does nothing.
 */
export function useSavedPlanShoppingList({ recipeIds, servings }: UseSavedPlanShoppingListOptions) {
  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState<SavedPlanShoppingList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const fetchShoppingList = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setShoppingList(null);
        setError(SIGN_IN_REQUIRED);
        return;
      }
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipeIds, servings })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.error) {
        console.error('[saved-plan-shopping-list] request failed:', res.status, data?.error);
        setShoppingList(null);
        setError(SHOPPING_LIST_LOAD_ERROR);
        return;
      }

      // Normalize API response to drawer shape
      const normalizedToBuy: SavedPlanShoppingList['byCategory']['toBuy'] = {};
      if (data.toBuy && Array.isArray(data.toBuy)) {
        for (const group of data.toBuy) {
          const catKey = group.category || 'other';
          normalizedToBuy[catKey] = Array.isArray(group.items) ? group.items : [];
        }
      }

      const normalizedByRecipe: SavedPlanShoppingList['byRecipe'] = [];
      if (data.byRecipe && Array.isArray(data.byRecipe)) {
        for (const rb of data.byRecipe) {
          normalizedByRecipe.push({
            recipeName: rb.recipeName || rb.name || 'Unknown',
            pantry: Array.isArray(rb.pantry) ? rb.pantry : [],
            toBuy: Array.isArray(rb.toBuy) ? rb.toBuy : []
          });
        }
      }

      // Meals whose recipe is no longer available were skipped by the API;
      // only their number is known. If every meal was skipped, nothing can
      // be listed.
      const unavailableCount = Number(data.unavailableRecipeCount) || 0;
      let notice = null;
      if (unavailableCount > 0) {
        notice = unavailableCount >= recipeIds.length
          ? '呢個餐單嘅食譜已經唔再提供，無法產生購物清單'
          : `有 ${unavailableCount} 個餐點嘅食譜已經唔再提供，購物清單未包括佢哋`;
      }

      setShoppingList({
        byCategory: {
          pantry: Array.isArray(data.pantry) ? data.pantry : [],
          toBuy: normalizedToBuy
        },
        byRecipe: normalizedByRecipe,
        notice,
        noUsableRecipes: unavailableCount > 0 && unavailableCount >= recipeIds.length
      });
    } catch (err) {
      console.error('[saved-plan-shopping-list] request failed:', err);
      setShoppingList(null);
      setError(SHOPPING_LIST_LOAD_ERROR);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [getAccessToken, recipeIds, servings]);

  return { shoppingList, loading, error, fetchShoppingList };
}
