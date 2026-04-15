import { useState, useRef, useCallback } from 'react';
import { fetchGeneratedPlanShoppingList } from '../services/fetchGeneratedPlanShoppingList';
import { normalizePlanForSave, saveGeneratedPlan } from '../index';
import { formatShoppingListCopyText } from '@/features/shopping-list/mappers';
import type { ShoppingListViewModel } from '@/features/shopping-list/types';

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

  // Shopping List State - Use new ViewModel
  const [shoppingListView, setShoppingListView] = useState<ShoppingListViewModel | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isShoppingListLoading, setIsShoppingListLoading] = useState(false);
  const [shoppingListError, setShoppingListError] = useState<string | null>(null);

  // Save State
  const [saveNotice, setSaveNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Recipe click handler
  const handleRecipeClick = useCallback(async (recipe: any) => {
    clickStartRef.current = performance.now();
    
    if (recipeCache.current.has(recipe.id)) {
      const cached = recipeCache.current.get(recipe.id);
      setSelectedRecipe(cached);
      return;
    }
    
    setModalLoading(true);
    
    try {
      const res = await fetch('/api/recipes/' + recipe.id, {
        headers: traceId ? { 'x-perf-trace-id': traceId } : undefined
      });
      const data = await res.json();
      
      const recipeDetail = data?.recipe ?? null;
      if (!recipeDetail) throw new Error('Invalid recipe detail payload');
      
      recipeCache.current.set(recipe.id, recipeDetail);
      setSelectedRecipe(recipeDetail);
    } catch (error) {
      console.error('Recipe fetch error:', error);
    } finally {
      setModalLoading(false);
    }
  }, [traceId]);

  const handleCloseRecipe = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  // Shopping list handlers
  const handleOpenShoppingList = useCallback(async () => {
    if (shoppingListView || shoppingListError) {
      setShowShoppingList(true);
      return;
    }
    
    setShowShoppingList(true);
    setIsShoppingListLoading(true);
    
    try {
      const viewModel = await fetchGeneratedPlanShoppingList(
        weeklyPlan,
        pantryIngredients,
        servings,
        { traceId }
      );
      setShoppingListView(viewModel);
    } catch (err) {
      setShoppingListError((err as Error).message);
    } finally {
      setIsShoppingListLoading(false);
    }
  }, [weeklyPlan, pantryIngredients, servings, traceId, shoppingListView, shoppingListError]);

  const handleCloseShoppingList = useCallback(() => {
    setShowShoppingList(false);
  }, []);

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
    setShoppingListView(null);
    setIsShoppingListLoading(false);
    setShoppingListError(null);
    setShowShoppingList(false);
    setSaveNotice('');
  }, []);

  return {
    selectedRecipe,
    modalLoading,
    handleRecipeClick,
    handleCloseRecipe,
    shoppingListView,
    showShoppingList,
    isShoppingListLoading,
    shoppingListError,
    handleOpenShoppingList,
    handleCloseShoppingList,
    handleCopyShoppingList,
    saveNotice,
    isSaving,
    handleSave,
    handleClearAll,
  };
}
