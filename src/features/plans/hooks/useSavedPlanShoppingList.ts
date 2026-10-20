import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalSelections, selectionKey, scopeSelections } from '@/features/shopping-list/optionalSelections';
import { mapRawCategoryToKey } from '@/features/shopping-list/mappers';
import type { OptionalIngredientGroup } from '@/features/shopping-list/types';

export const SHOPPING_LIST_LOAD_ERROR = '購物清單載入失敗，請重試';
const SIGN_IN_REQUIRED = '請先登入以查看購物清單';

// The shape ShoppingListDrawer renders.
export interface SavedPlanShoppingList {
  optionalIngredients?: OptionalIngredientGroup[];
  dietaryNotes?: string[];
  byCategory: { pantry: unknown[]; toBuy: Record<string, unknown[]> };
  byRecipe: Array<{ recipeName: string; pantry: unknown[]; toBuy: unknown[] }>;
  notice: string | null;
  noUsableRecipes: boolean;
}

interface UseSavedPlanShoppingListOptions {
  recipeIds: string[];
  servings: number;
}

interface ListState {
  key: string;
  loading: boolean;
  shoppingList: SavedPlanShoppingList | null;
  error: string | null;
}

/**
 * Loads a saved plan's shopping list from /api/shopping-list and maps it to
 * the ShoppingListDrawer shape.
 *
 * A failed request (HTTP error, unreadable body, network failure) ends in
 * `error` with a fixed message and no list, so the drawer never shows a blank
 * panel, an earlier result, or backend error text. Requests and results belong
 * to an account/recipe-occurrences/servings scope. Concurrent calls for that
 * scope are deduplicated; switching scope cancels obsolete work.
 */
export function useSavedPlanShoppingList({ recipeIds, servings }: UseSavedPlanShoppingListOptions) {
  const { getAccessToken, user, isAuthenticated } = useAuth();
  const { selections: allSelections } = useOptionalSelections(user?.id);
  const selections = scopeSelections(allSelections, recipeIds);
  const optionalKey = selectionKey(selections);
  // Keep every occurrence: repeated meals contribute repeated ingredients.
  const key = JSON.stringify([user?.id, isAuthenticated, recipeIds, servings, optionalKey]);
  const [state, setState] = useState<ListState | null>(null);
  const requestRef = useRef<{ key: string; active: boolean; controller: AbortController } | null>(null);
  const invalidate = useCallback(() => {
    if (requestRef.current) {
      requestRef.current.active = false;
      requestRef.current.controller.abort();
      requestRef.current = null;
    }
  }, []);
  useEffect(() => invalidate, [key, invalidate]);
  // Hide an old result during render, before the scope cleanup effect runs.
  const current = state?.key === key ? state : null;
  const shoppingList = current?.shoppingList ?? null;
  const loading = current?.loading ?? false;
  const error = current?.error ?? null;

  const fetchShoppingList = useCallback(async () => {
    if (requestRef.current?.key === key && requestRef.current.active) return;
    invalidate();
    const request = { key, active: true, controller: new AbortController() };
    requestRef.current = request;
    setState({ key, shoppingList: null, error: null, loading: true });

    try {
      if (!isAuthenticated || !user?.id) {
        setState({ key, shoppingList: null, error: SIGN_IN_REQUIRED, loading: false });
        return;
      }
      const token = await getAccessToken();
      if (!request.active) return;
      if (!token) {
        setState({ key, shoppingList: null, error: SIGN_IN_REQUIRED, loading: false });
        return;
      }
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipeIds, servings, ...(Object.keys(selections).length ? { optionalSelections: selections } : {}) }),
        signal: request.controller.signal
      });
      if (!request.active) return;
      const data = await res.json().catch(() => null);
      if (!request.active) return;

      if (!res.ok || !data || data.error) {
        console.error('[saved-plan-shopping-list] request failed:', res.status, data?.error);
        setState({ key, shoppingList: null, error: SHOPPING_LIST_LOAD_ERROR, loading: false });
        return;
      }

      // Normalize API response to drawer shape
      const normalizedToBuy: SavedPlanShoppingList['byCategory']['toBuy'] = {};
      if (data.toBuy && Array.isArray(data.toBuy)) {
        for (const group of data.toBuy) {
          const catKey = mapRawCategoryToKey(group.category);
          normalizedToBuy[catKey] = [...(normalizedToBuy[catKey] || []), ...(Array.isArray(group.items) ? group.items : [])];
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

      setState({ key, loading: false, error: null, shoppingList: {
        optionalIngredients: Array.isArray(data.optionalIngredients) ? data.optionalIngredients : [],
        dietaryNotes: Array.isArray(data.dietaryNotes) ? data.dietaryNotes : [],
        byCategory: {
          pantry: Array.isArray(data.pantry) ? data.pantry : [],
          toBuy: normalizedToBuy
        },
        byRecipe: normalizedByRecipe,
        notice,
        noUsableRecipes: unavailableCount > 0 && unavailableCount >= recipeIds.length
      } });
    } catch (err) {
      if (!request.active) return;
      console.error('[saved-plan-shopping-list] request failed:', err);
      setState({ key, shoppingList: null, error: SHOPPING_LIST_LOAD_ERROR, loading: false });
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  }, [getAccessToken, recipeIds, servings, key, invalidate, isAuthenticated, user?.id, selections]);

  return { shoppingList, loading, error, fetchShoppingList };
}
