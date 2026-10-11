import { useState, useRef, useCallback, useEffect } from 'react';
import { useGeneratedShoppingList } from './useGeneratedShoppingList';
import { normalizePlanForSave, saveGeneratedPlan } from '../index';
import { formatShoppingListCopyText } from '@/features/shopping-list/mappers';

interface UseGenerateActionsOptions {
  weeklyPlan: any;
  pantryIngredients: string[];
  servings: number;
  daysPerWeek: number;
  isAuthenticated: boolean;
  userId: string | null;
  getAccessToken: () => Promise<string | null>;
  traceId?: string;
}

export function useGenerateActions({
  weeklyPlan,
  pantryIngredients,
  servings,
  daysPerWeek,
  isAuthenticated,
  userId,
  getAccessToken,
  traceId,
}: UseGenerateActionsOptions) {
  // Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const recipeCache = useRef(new Map());
  const clickStartRef = useRef<number>(0);
  const recipeRequestRef = useRef<AbortController | null>(null);
  const recipeRequestVersion = useRef(0);
  const cancelRecipeRequest = useCallback(() => {
    recipeRequestVersion.current += 1;
    recipeRequestRef.current?.abort();
    recipeRequestRef.current = null;
  }, []);
  useEffect(() => cancelRecipeRequest, [cancelRecipeRequest]);

  const { shoppingListView, showShoppingList, isShoppingListLoading, shoppingListError,
    preloadShoppingList, handleOpenShoppingList, handleCloseShoppingList, clearShoppingList,
  } = useGeneratedShoppingList({ weeklyPlan, pantryIngredients, servings, isAuthenticated, userId, getAccessToken, traceId });

  // Save State
  const [saveNotice, setSaveNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Recipe click handler
  const handleRecipeClick = useCallback(async (recipe: any) => {
    cancelRecipeRequest();
    const version = recipeRequestVersion.current;
    clickStartRef.current = performance.now();
    
    if (recipeCache.current.has(recipe.id)) {
      const cached = recipeCache.current.get(recipe.id);
      setSelectedRecipe(cached);
      setModalLoading(false);
      return;
    }
    
    const controller = new AbortController();
    recipeRequestRef.current = controller;
    const isCurrent = () => recipeRequestVersion.current === version && !controller.signal.aborted;
    setModalLoading(true);
    
    try {
      const res = await fetch('/api/recipes/' + recipe.id, {
        signal: controller.signal,
        headers: traceId ? { 'x-perf-trace-id': traceId } : undefined
      });
      if (!isCurrent()) return;
      if (!res.ok) throw new Error('Recipe detail request failed: ' + res.status);
      const data = await res.json();
      if (!isCurrent()) return;
      
      const recipeDetail = data?.recipe ?? null;
      if (!recipeDetail || recipeDetail.id !== recipe.id) throw new Error('Invalid recipe detail payload');
      
      recipeCache.current.set(recipe.id, recipeDetail);
      setSelectedRecipe(recipeDetail);
      
    } catch (error) {
      if (isCurrent()) console.error('Recipe fetch error:', error);
    } finally {
      if (isCurrent()) {
        recipeRequestRef.current = null;
        setModalLoading(false);
      }
    }
  }, [traceId, cancelRecipeRequest]);

  const handleCloseRecipe = useCallback(() => {
    cancelRecipeRequest();
    setSelectedRecipe(null);
    setModalLoading(false);
  }, [cancelRecipeRequest]);

  // Copy shopping list
  const handleCopyShoppingList = useCallback(async () => {
    if (!shoppingListView) return '';
    
    const copyText = formatShoppingListCopyText(shoppingListView);
    
    try {
      await navigator.clipboard.writeText(copyText);
      setSaveNotice('✅ 已複製到剪貼簿');
      setTimeout(() => setSaveNotice(''), 3000);
    } catch {
      setSaveNotice('❌ 複製失敗');
      setTimeout(() => setSaveNotice(''), 3000);
    }
  }, [shoppingListView]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    const payload = normalizePlanForSave(weeklyPlan, servings, daysPerWeek);
    if (payload.items.length === 0) {
      alert('No meal plan to save');
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

  const handleClearAll = useCallback(() => {
    handleCloseRecipe();
    clearShoppingList();
    setSaveNotice('');
  }, [handleCloseRecipe, clearShoppingList]);

  return {
    selectedRecipe,
    modalLoading,
    handleRecipeClick,
    handleCloseRecipe,
    shoppingListView,
    showShoppingList,
    isShoppingListLoading,
    shoppingListError,
    preloadShoppingList,
    handleOpenShoppingList,
    handleCloseShoppingList,
    handleCopyShoppingList,
    saveNotice,
    isSaving,
    handleSave,
    handleClearAll,
  };
}
