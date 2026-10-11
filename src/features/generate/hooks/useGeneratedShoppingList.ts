import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGeneratedPlanShoppingList } from '../services/fetchGeneratedPlanShoppingList';
import type { ShoppingListViewModel } from '@/features/shopping-list/types';
import { perfLog } from '@/utils/perf';

interface Options {
  weeklyPlan: Record<string, Array<{ id?: string | null } | null>>;
  pantryIngredients: string[];
  servings: number;
  isAuthenticated: boolean;
  userId: string | null;
  getAccessToken: () => Promise<string | null>;
  traceId?: string;
}
interface ListState {
  key: string;
  view: ShoppingListViewModel | null;
  error: string | null;
  loading: boolean;
}

export function useGeneratedShoppingList({ weeklyPlan, pantryIngredients, servings,
  isAuthenticated, userId, getAccessToken, traceId }: Options) {
  // Preserve repeated recipes: each occurrence contributes to shopping quantities.
  const recipeIds = Object.values(weeklyPlan || {}).flat().flatMap(recipe => recipe?.id ? [String(recipe.id)] : []).sort();
  const key = JSON.stringify([userId, isAuthenticated, recipeIds, servings, pantryIngredients.slice().sort()]);
  const [state, setState] = useState<ListState | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const requestRef = useRef<{ active: boolean } | null>(null);
  const invalidate = useCallback(() => {
    if (requestRef.current) requestRef.current.active = false;
    requestRef.current = null;
  }, []);
  // A plan/account transition or unmount invalidates even an unresolved token lookup.
  useEffect(() => invalidate, [key, invalidate]);
  const current = state?.key === key ? state : null;
  const shoppingListView = current?.view ?? null;
  const shoppingListError = current?.error ?? null;
  const isShoppingListLoading = current?.loading ?? false;

  const load = useCallback(async (preload: boolean) => {
    const log = (stage: string, duration = 0, meta = {}) => perfLog({ event: 'shopping_list',
      stage, label: `shopping_list.${stage}`, duration, meta });
    if (!preload) log('open_click', 0, { selectedRecipeCount: recipeIds.length });
    if (!preload) setShowShoppingList(true);
    if (shoppingListView) {
      if (!preload) log('memory_hit', 0, { hasView: true, hasError: false });
      return;
    }
    if (preload && (isShoppingListLoading || recipeIds.length === 0 || !isAuthenticated || !userId)) return;
    invalidate();
    const request = { active: true };
    requestRef.current = request;
    setState({ key, view: null, error: null, loading: true });
    if (preload) log('preload_start');
    try {
      if (!isAuthenticated || !userId) throw new Error('請先登入以查看購物清單');
      const token = await getAccessToken();
      if (!request.active) return;
      if (!token) throw new Error('請先登入以查看購物清單');
      const started = Date.now();
      const view = await fetchGeneratedPlanShoppingList(weeklyPlan, pantryIngredients, servings,
        { traceId, token, cacheScope: userId });
      if (!request.active) return;
      setState({ key, view, error: null, loading: false });
      log(preload ? 'preload_ready' : 'ready', Date.now() - started, view.summary);
    } catch (error) {
      if (!request.active) return;
      setState({ key, view: null, error: preload ? null : (error as Error).message, loading: false });
      log(preload ? 'preload_error' : 'error', 0, { message: (error as Error).message });
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  }, [key, shoppingListView, isShoppingListLoading, recipeIds.length, isAuthenticated, userId,
    getAccessToken, weeklyPlan, pantryIngredients, servings, traceId, invalidate]);

  const handleOpenShoppingList = useCallback(() => load(false), [load]);
  const preloadShoppingList = useCallback(() => load(true), [load]);
  const handleCloseShoppingList = useCallback(() => {
    invalidate();
    setShowShoppingList(false);
    setState(previous => previous ? { ...previous, loading: false } : null);
  }, [invalidate]);
  const clearShoppingList = useCallback(() => {
    invalidate();
    setState(null);
    setShowShoppingList(false);
  }, [invalidate]);

  return { shoppingListView, shoppingListError, isShoppingListLoading, showShoppingList,
    handleOpenShoppingList, handleCloseShoppingList, preloadShoppingList, clearShoppingList };
}
