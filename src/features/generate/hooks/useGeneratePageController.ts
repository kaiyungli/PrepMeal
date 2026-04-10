/**
 * useGeneratePageController - Main orchestration hook for Generate page
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import {
  fetchAvailableRecipes,
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
  
  // Recipe State
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Plan State
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}) as WeeklyPlan
  );
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});
  
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
  
  // Fetch recipes on mount
  useEffect(() => {
    fetchAvailableRecipes(200)
      .then(recipes => setAllRecipes(recipes))
      .catch(() => {});
  }, []);
  
  // Read pantry from URL
  useEffect(() => {
    const { ingredients } = router.query;
    if (ingredients) {
      const parsed = ingredients.toString().split(',').map(i => i.trim()).filter(Boolean);
      setPantryIngredients(parsed);
    }
  }, [router.query]);
  
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
  const handleGenerate = useCallback(() => {
    const genStart = perfNow();
    
    const lockedRecipes: Record<string, any> = {};
    Object.entries(lockedSlots).forEach(([key, isLocked]) => {
      if (isLocked) {
        const [dayKey, indexStr] = key.split('-');
        const index = parseInt(indexStr);
        if (weeklyPlan[dayKey]?.[index]) {
          lockedRecipes[key] = weeklyPlan[dayKey][index];
        }
      }
    });

    const plannerStart = perfNow();
    const newPlan = generateWeeklyPlan(filteredRecipes, {
      daysPerWeek,
      dishesPerDay: effectiveDishesPerDay,
      slotRoles: compositionConfig.slotRoles,
      dailyComposition,
      isWeekend: (dayKey: string) => DAYS.find(d => d.key === dayKey)?.isWeekend || false,
      cuisines,
      exclusions,
      cookingConstraints,
      budget: budget || 'medium',
      pantryIngredients,
      lockedSlots,
      lockedRecipes
    });

    setWeeklyPlan(newPlan);
    perfMeasure('generate.handleGenerate.planWeekAdvanced', plannerStart);
    perfMeasure('generate.handleGenerate.total', genStart);
    setHasGenerated(true);
  }, [filteredRecipes, daysPerWeek, effectiveDishesPerDay, compositionConfig, dailyComposition, cuisines, exclusions, cookingConstraints, budget, pantryIngredients, lockedSlots, weeklyPlan]);
  
  // Replace recipe at slot
  const handleReplaceRecipe = useCallback((dayKey: string, index: number) => {
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id));
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      setWeeklyPlan(prev => ({
        ...prev,
        [dayKey]: (prev[dayKey] || []).map((r, i) => i === index ? random : r)
      }));
    }
  }, [weeklyPlan, filteredRecipes]);
  
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
  }, [clearFilters]);
  
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
  
  const lockSlot = useCallback((dayKey: string, index: number) => {
    const key = `${dayKey}-${index}`;
    setLockedSlots(prev => ({ ...prev, [key]: true }));
  }, []);
  
  const unlockSlot = useCallback((dayKey: string, index: number) => {
    const key = `${dayKey}-${index}`;
    setLockedSlots(prev => ({ ...prev, [key]: false }));
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
    filteredRecipes,
    selectedRecipe,
    modalLoading,
    pantryIngredients,
    hasGenerated,
    weeklyPlan,
    lockedSlots,
    shoppingList,
    showShoppingList,
    shoppingListLoaded,
    saveNotice,
    isSaving,
    handleGenerate,
    handleReplaceRecipe,
    handleAddRandomRecipe,
    handleOpenShoppingList,
    handleClearAll,
    handleSave,
    handleRecipeClick,
    handleCloseRecipe,
    setShowShoppingList,
    lockSlot,
    unlockSlot,
    removeRecipe,
    setWeeklyPlan,
    hasRecipes,
    selectedCount,
  };
}
