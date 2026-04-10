import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchGeneratedPlanShoppingList, normalizePlanForSave, saveGeneratedPlan } from '../index';

interface UseGenerateActionsOptions {
  weeklyPlan: any;
  pantryIngredients: string[];
  servings: number;
  daysPerWeek: number;
  isAuthenticated: boolean;
  getAccessToken: () => Promise<string | null>;
}

export function useGenerateActions({
  weeklyPlan,
  pantryIngredients,
  servings,
  daysPerWeek,
  isAuthenticated,
  getAccessToken,
}: UseGenerateActionsOptions) {
  // Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const recipeCache = useRef(new Map());

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
      (async () => {
        try {
          const list = await fetchGeneratedPlanShoppingList(weeklyPlan, pantryIngredients, servings);
          setShoppingList(list);
          setShoppingListLoaded(true);
        } catch (err) {
          console.error('Error preloading shopping list:', err);
          setShoppingListLoaded(true);
        }
      })();
    }
  }, [showShoppingList, shoppingListLoaded, weeklyPlan, pantryIngredients, servings]);

  // Recipe click handler
  const handleRecipeClick = useCallback((recipe: any) => {
    if (recipeCache.current.has(recipe.id)) {
      setSelectedRecipe(recipeCache.current.get(recipe.id));
      return;
    }
    setModalLoading(true);
    fetch('/api/recipes/' + recipe.id)
      .then(res => res.json())
      .then(data => {
        recipeCache.current.set(recipe.id, data);
        setSelectedRecipe(data);
      })
      .finally(() => setModalLoading(false));
  }, []);

  const handleCloseRecipe = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const handleOpenShoppingList = useCallback(() => {
    setShowShoppingList(true);
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
    // Modal
    selectedRecipe,
    modalLoading,
    handleRecipeClick,
    handleCloseRecipe,

    // Shopping List
    shoppingList,
    showShoppingList,
    shoppingListLoaded,
    handleOpenShoppingList,
    setShowShoppingList,

    // Save
    saveNotice,
    isSaving,
    handleSave,
    handleClearAll,
  };
}