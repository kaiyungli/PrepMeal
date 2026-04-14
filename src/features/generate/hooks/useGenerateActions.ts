import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchGeneratedPlanShoppingList, normalizePlanForSave, saveGeneratedPlan } from '../index';
import { perfNow, perfLog } from '@/utils/perf';

interface UseGenerateActionsOptions {
  weeklyPlan: any;
  pantryIngredients: string[];
  servings: number;
  daysPerWeek: number;
  isAuthenticated: boolean;
  getAccessToken: () => Promise<string | null>;
  traceId?: string;
}

export function useGenerateActions({
  weeklyPlan,
  pantryIngredients,
  servings,
  daysPerWeek,
  isAuthenticated,
  getAccessToken,
  traceId,
}: UseGenerateActionsOptions) {
  // Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const recipeCache = useRef(new Map());
  const clickStartRef = useRef<number>(0);

  // Shopping List State
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingListLoaded, setShoppingListLoaded] = useState(false);

  // Save State
  const [saveNotice, setSaveNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preload shopping list
  useEffect(() => {
    if (showShoppingList && !shoppingListLoaded && Object.keys(weeklyPlan).length > 0) {
      const loadStart = perfNow();
      
      (async () => {
        try {
          const list = await fetchGeneratedPlanShoppingList(weeklyPlan, pantryIngredients, servings, traceId);
          setShoppingList(list);
          setShoppingListLoaded(true);
          
          // Log ready (lifecycle marker)
          const recipeCount = Object.values(weeklyPlan).flat().length;
          perfLog({
            traceId,
            event: 'shopping_list',
            stage: 'ready',
            label: 'shopping_list.ready',
            duration: 0,
            meta: { itemCount: list.length, loadedFromPlanRecipeCount: recipeCount }
          });
        } catch (err) {
          console.error('Error preloading shopping list:', err);
          setShoppingListLoaded(true);
        }
      })();
    }
  }, [showShoppingList, shoppingListLoaded, weeklyPlan, pantryIngredients, servings, traceId]);

  // Recipe click handler
  const handleRecipeClick = useCallback((recipe: any) => {
    clickStartRef.current = perfNow();
    
    // Always log open_click first
    perfLog({
      traceId,
      event: 'recipe_modal',
      stage: 'open_click',
      label: 'recipe_modal.open_click',
      duration: 0,
      meta: { recipeId: recipe.id }
    });
    
    if (recipeCache.current.has(recipe.id)) {
      perfLog({
        traceId,
        event: 'recipe_modal',
        stage: 'cache_hit',
        label: 'recipe_modal.cache_hit',
        duration: 0,
        meta: { recipeId: recipe.id }
      });
      const cached = recipeCache.current.get(recipe.id);
      const recipeDetail = cached?.recipe ?? cached;
      setSelectedRecipe(recipeDetail);
      return;
    }
    
    setModalLoading(true);
    fetch('/api/recipes/' + recipe.id, {
        headers: traceId ? { 'x-perf-trace-id': traceId } : undefined
      })
      .then(res => res.json())
      .then(data => {
        recipeCache.current.set(recipe.id, data);
        setSelectedRecipe(data);
        
        perfLog({
          traceId,
          event: 'recipe_modal',
          stage: 'render_ready',
          label: 'recipe_modal.render_ready',
          start: clickStartRef.current,
          meta: { recipeId: recipe.id }
        });
      })
      .catch(() => {
        perfLog({
          traceId,
          event: 'recipe_modal',
          stage: 'render_error',
          label: 'recipe_modal.render_error',
          start: clickStartRef.current,
          meta: { recipeId: recipe.id }
        });
      })
      .finally(() => setModalLoading(false));
  }, [traceId]);

  const handleCloseRecipe = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const handleOpenShoppingList = useCallback(() => {
    const recipeCount = Object.values(weeklyPlan).flat().length;
    perfLog({
      traceId,
      event: 'shopping_list',
      stage: 'open_click',
      label: 'shopping_list.open_click',
      duration: 0,
      meta: { selectedRecipeCount: recipeCount }
    });
    setShowShoppingList(true);
  }, [weeklyPlan, traceId]);

  const handleCloseShoppingList = useCallback(() => {
    setShowShoppingList(false);
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    if (!isAuthenticated) {
      alert('請先登入以保存餐單');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    const payload = normalizePlanForSave(weeklyPlan, servings, daysPerWeek);

    if (payload.items.length === 0) {
      alert('沒有餐單內容可以保存');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      alert('登入狀態已失效，請重新登入');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    try {
      setIsSaving(true);
      const result = await saveGeneratedPlan(payload, token);
      if (!result.success) throw new Error(result.error);
      setSaveNotice(`✅ 已保存餐單：${payload.name}`);
      setTimeout(() => setSaveNotice(''), 3000);
    } catch (e) {
      alert('保存失敗: ' + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, isAuthenticated, getAccessToken, weeklyPlan, servings, daysPerWeek]);

  // Clear all handler
  const handleClearAll = useCallback(() => {
    setShoppingList([]);
    setShoppingListLoaded(false);
    setShowShoppingList(false);
    setSaveNotice('');
  }, []);

  return {
    selectedRecipe,
    modalLoading,
    handleRecipeClick,
    handleCloseRecipe,
    shoppingList,
    showShoppingList,
    shoppingListLoaded,
    handleOpenShoppingList,
    handleCloseShoppingList,
    saveNotice,
    isSaving,
    handleSave,
    handleClearAll,
  };
}
