/**
 * useGeneratePageController - Main orchestration hook for Generate page
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { useGenerateData } from './useGenerateData';
import { useGeneratePlan } from './useGeneratePlan';
import { useGenerateActions } from './useGenerateActions';
import {
  saveGeneratedPlan,
  fetchGeneratedPlanShoppingList,
  generateWeeklyPlan,
  normalizePlanForSave,
} from '../index';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { getWeekDates } from '@/utils/dateUtils';
import { perfNow, perfMeasure } from '@/utils/perf';
import { recipeMatchesFilters } from '@/constants/filters';

const DAYS = getWeekDates();

interface WeeklyPlan {
  [dayKey: string]: any[];
}

interface UseGeneratePageControllerOptions {
  preferences?: ReturnType<typeof useGeneratePreferences>;
}

export function useGeneratePageController(options: UseGeneratePageControllerOptions = {}) {
  const router = useRouter();
  const { isAuthenticated, getAccessToken } = useAuth();
  const preferences = options.preferences || useGeneratePreferences();
  
  const {
    daysPerWeek,
    dailyComposition,
    servings,
    exclusions,
    cuisines,
    cookingConstraints,
    budget,
    filters,
    clearFilters,
  } = preferences;
  
  const compositionKey = dailyComposition || 'meat_veg';
  const compositionConfig = COMPOSITION_CONFIG[compositionKey as keyof typeof COMPOSITION_CONFIG] || COMPOSITION_CONFIG.meat_veg;
  const effectiveDishesPerDay = compositionConfig.dishesPerDay;
  
  // Data from useGenerateData hook
  const { allRecipes, loadingRecipes, pantryIngredients } = useGenerateData();
  
  // UI State
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Shopping List State
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingListLoaded, setShoppingListLoaded] = useState(false);
  
  // Save State
  const [saveNotice, setSaveNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Recipe Cache
  const recipeCache = useRef(new Map());
  
  // Filtered recipes with full filtering
  const filteredRecipes = useMemo(() => {
    if (!allRecipes.length) return [];
    
    return allRecipes.filter((recipe: any) => {
      // Negative filter: exclusions
      if (exclusions && exclusions.length > 0) {
        const proteins = recipe.protein || [];
        const allProteins: any[] = [...proteins];
        if (recipe.primary_protein) allProteins.push(recipe.primary_protein);
        for (const p of allProteins) {
          if (p && (exclusions as any).includes(p)) return false;
        }
      }
      
      // Positive filter: recipeMatchesFilters
      if (filters && Object.keys(filters).length > 0) {
        try {
          if (!recipeMatchesFilters(recipe as any, filters as any)) return false;
        } catch (e) {
          // Include on error
        }
      }
      
      return true;
    });
  }, [allRecipes, exclusions, filters]);
  
  // Plan from useGeneratePlan hook (after filteredRecipes is available)
  const { 
    weeklyPlan, 
    setWeeklyPlan, 
    lockedSlots, 
    setLockedSlots,
    lockSlot: hookLockSlot, 
    unlockSlot: hookUnlockSlot,
    handleGenerate: hookHandleGenerate,
    handleReplaceRecipe: hookHandleReplaceRecipe
  } = useGeneratePlan({
    filteredRecipes,
    dailyComposition,
    daysPerWeek,
    effectiveDishesPerDay,
    cuisines,
    exclusions,
    cookingConstraints,
    budget: budget || 'medium',
    pantryIngredients
  });
  
  // Actions from useGenerateActions hook
  const actions = useGenerateActions({
    weeklyPlan,
    pantryIngredients,
    servings,
    daysPerWeek,
    isAuthenticated,
    getAccessToken
  });
  
  // Restore hero plan from session storage
  useEffect(() => {
    const heroPlanStr = sessionStorage.getItem('heroWeeklyPlan');
    if (heroPlanStr) {
      try {
        const heroPlan = JSON.parse(heroPlanStr);
        if (heroPlan && heroPlan.length > 0) {
          const converted: WeeklyPlan = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
          const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
          const dayMap: Record<string, string> = {
            '週一': 'mon', '週二': 'tue', '週三': 'wed', '週四': 'thu', '週五': 'fri',
            '週六': 'sat', '週日': 'sun', '週天': 'sun',
            'mon': 'mon', 'tue': 'tue', 'wed': 'wed', 'thu': 'thu', 'fri': 'fri', 'sat': 'sat', 'sun': 'sun'
          };
          
          heroPlan.forEach((item: any, idx: number) => {
            const dayKey = dayMap[item.day] || days[idx % 7];
            if (item.recipe && converted[dayKey]) {
              converted[dayKey].push(item.recipe);
            }
          });
          
          setWeeklyPlan(converted);
          setHasGenerated(true);
          sessionStorage.removeItem('heroWeeklyPlan');
        }
      } catch (e) {
        console.error('[Generate] Failed to parse hero weekly plan:', e);
      }
    }
  }, []);
  
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
  
  // Handlers
  
  // Add random recipe to day
  const handleAddRandomRecipe = useCallback((dayKey: string) => {
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id));
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      setWeeklyPlan(prev => ({
        ...prev,
        [dayKey]: [...(prev[dayKey] || []), random]
      }));
    }
  }, [weeklyPlan, filteredRecipes]);
  
  const handleOpenShoppingList = useCallback(() => {
    setShowShoppingList(true);
  }, []);
  
  const handleClearAll = useCallback(() => {
    setWeeklyPlan(DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}) as WeeklyPlan);
    setLockedSlots({});
    setHasGenerated(false);
    setShoppingList([]);
    setShoppingListLoaded(false);
    setShowShoppingList(false);
    clearFilters();
  }, [clearFilters, setWeeklyPlan, setLockedSlots]);
  
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
  

  
  const removeRecipe = useCallback((dayKey: string, index: number) => {
    setWeeklyPlan(prev => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes.splice(index, 1);
      return { ...prev, [dayKey]: dayRecipes };
    });
  }, []);
  
  const hasRecipes = Object.values(weeklyPlan).some(arr => Array.isArray(arr) && arr.length > 0);
  const selectedCount = Object.values(weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  
  return {
    preferences,
    daysPerWeek,
    servings,
    effectiveDishesPerDay,
    allRecipes,
    loadingRecipes,
    filteredRecipes,
    selectedRecipe: actions.selectedRecipe,
    modalLoading: actions.modalLoading,
    pantryIngredients,
    hasGenerated,
    weeklyPlan,
    setWeeklyPlan,
    lockedSlots,
    shoppingList: actions.shoppingList,
    showShoppingList: actions.showShoppingList,
    shoppingListLoaded: actions.shoppingListLoaded,
    saveNotice: actions.saveNotice,
    isSaving: actions.isSaving,
    handleGenerate: hookHandleGenerate,
    handleReplaceRecipe: hookHandleReplaceRecipe,
    handleAddRandomRecipe,
    handleOpenShoppingList: actions.handleOpenShoppingList,
    handleClearAll: () => { actions.handleClearAll(); clearFilters(); },
    handleSave: actions.handleSave,
    handleRecipeClick: actions.handleRecipeClick,
    handleCloseRecipe: actions.handleCloseRecipe,
    setShowShoppingList: actions.setShowShoppingList,
    lockSlot: hookLockSlot,
    unlockSlot: hookUnlockSlot,
    removeRecipe,
    hasRecipes,
    selectedCount,
  };
}
