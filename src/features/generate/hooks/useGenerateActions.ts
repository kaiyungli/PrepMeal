import { useState, useRef, useCallback } from 'react';
import { fetchGeneratedPlanShoppingList } from '../services/fetchGeneratedPlanShoppingList';
import { perfLog } from '@/utils/perf';
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
    const currentSignature = `${Object.values(weeklyPlan || {}).flat().filter(Boolean).map((r: any) => r.id).sort().join(',')}-\${servings}-\${pantryIngredients?.length || 0}`;
  const [shoppingListPlanSignature, setShoppingListPlanSignature] = useState<string | null>(null);

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
    // Click log
    const selectedCount = Object.values(weeklyPlan).reduce((sum: number, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    perfLog({
      event: 'shopping_list',
      stage: 'open_click',
      label: 'shopping_list.open_click',
      duration: 0,
      meta: { selectedRecipeCount: selectedCount },
    });
    
    // Build signature to detect plan changes
    const currentSignature = `${Object.values(weeklyPlan || {}).flat().filter(Boolean).map((r: any) => r.id).sort().join(',')}-${servings}-${pantryIngredients?.length || 0}`;
    
    // If plan changed, clear stale cache
    if (currentSignature !== shoppingListPlanSignature && shoppingListView) {
      setShoppingListView(null);
      setShoppingListError(null);
    }
    
    // Reuse only if signature matches
    if ((shoppingListView || shoppingListError) && currentSignature === shoppingListPlanSignature) {
      perfLog({
        event: 'shopping_list',
        stage: 'memory_hit',
        label: 'shopping_list.memory_hit',
        duration: 0,
        meta: {
          hasView: !!shoppingListView,
          hasError: !!shoppingListError,
        },
      });
      setShowShoppingList(true);
      return;
    }
    
    setShowShoppingList(true);
    setIsShoppingListLoading(true);
    
    try {
      const t0 = Date.now();
      const viewModel = await fetchGeneratedPlanShoppingList(
        weeklyPlan,
        pantryIngredients,
        servings,
        { traceId }
      );
      setShoppingListView(viewModel);
    const currentSignature = `${Object.values(weeklyPlan || {}).flat().filter(Boolean).map((r: any) => r.id).sort().join(',')}-\${servings}-\${pantryIngredients?.length || 0}`;
      setShoppingListPlanSignature(currentSignature);
      
      // Ready log
      perfLog({
        event: 'shopping_list',
        stage: 'ready',
        label: 'shopping_list.ready',
        duration: Date.now() - t0,
        meta: {
          pantryCount: viewModel.summary?.pantryCount || 0,
          toBuyCount: viewModel.summary?.toBuyCount || 0,
          sectionCount: viewModel.summary?.sectionCount || 0,
        },
      });
    } catch (err) {
      // Error log
      perfLog({
        event: 'shopping_list',
        stage: 'error',
        label: 'shopping_list.error',
        duration: 0,
        meta: { message: (err as Error).message },
      });
      setShoppingListError((err as Error).message);
    } finally {
      setIsShoppingListLoading(false);
    }
  }, [weeklyPlan, pantryIngredients, servings, traceId, shoppingListView, shoppingListError, shoppingListPlanSignature]);

  const handleCloseShoppingList = useCallback(() => {
    setShowShoppingList(false);
  }, []);

  // Preload shopping list in background
  const preloadShoppingList = useCallback(async () => {
    if (shoppingListView) return;
    if (isShoppingListLoading) return;
    
    const recipeCount = Object.values(weeklyPlan).reduce((sum: number, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    if (recipeCount === 0) return;
    
    perfLog({
      event: 'shopping_list',
      stage: 'preload_start',
      label: 'shopping_list.preload_start',
      duration: 0,
    });
    
    try {
      const t0 = Date.now();
      const viewModel = await fetchGeneratedPlanShoppingList(
        weeklyPlan,
        pantryIngredients,
        servings,
        { traceId }
      );
      setShoppingListView(viewModel);
    const currentSignature = `${Object.values(weeklyPlan || {}).flat().filter(Boolean).map((r: any) => r.id).sort().join(',')}-\${servings}-\${pantryIngredients?.length || 0}`;
      setShoppingListPlanSignature(currentSignature);
      
      perfLog({
        event: 'shopping_list',
        stage: 'preload_ready',
        label: 'shopping_list.preload_ready',
        duration: Date.now() - t0,
        meta: {
          pantryCount: viewModel.summary?.pantryCount || 0,
          toBuyCount: viewModel.summary?.toBuyCount || 0,
          sectionCount: viewModel.summary?.sectionCount || 0,
        },
      });
    } catch (err) {
      perfLog({
        event: 'shopping_list',
        stage: 'preload_error',
        label: 'shopping_list.preload_error',
        duration: 0,
        meta: { message: (err as Error).message },
      });
    }
  }, [weeklyPlan, pantryIngredients, servings, traceId, shoppingListView, isShoppingListLoading]);

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
