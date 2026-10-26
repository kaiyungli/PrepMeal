import { useEffect, useMemo, useState, useRef } from 'react';
import { getPlanDetail } from '../services/getPlanDetail';
import { mapPlanItemsByDay } from '../mappers/mapPlanItemsByDay';
import { mapPlanItemMealSlot, mapPlanDaysByMealSlot } from '../mappers/mapPlanMealSlots';

interface UsePlanDetailControllerOptions {
  planId: string;
  isAuthenticated: boolean;
  userId?: string;
  getAccessToken: () => Promise<string | null>;
}

interface DetailState {
  key: string;
  plan: any;
  items: any[];
  groupedItems: Record<number, any[]>;
  loading: boolean;
  error: string | null;
  selectedRecipeId: string | null;
}
const EMPTY_ITEMS: DetailState['items'] = [];
const EMPTY_GROUPS: DetailState['groupedItems'] = {};

export function usePlanDetailController({
  planId,
  isAuthenticated,
  userId,
  getAccessToken
}: UsePlanDetailControllerOptions) {
  const key = JSON.stringify([isAuthenticated, userId, planId]);
  const [state, setState] = useState<DetailState | null>(null);
  // Discard obsolete state as well as hiding it. Otherwise logout→login on
  // the same account/plan could briefly resurrect the pre-logout state.
  if (state && state.key !== key) setState(null);
  // A refreshed token callback must not restart the same account/plan load.
  const tokenGetterRef = useRef(getAccessToken);
  useEffect(() => { tokenGetterRef.current = getAccessToken; }, [getAccessToken]);
  // Scope filtering happens during render, before effects can hide old data.
  const current = state?.key === key ? state : null;
  const plan = current?.plan ?? null;
  const items = current?.items ?? EMPTY_ITEMS;
  const groupedItems = current?.groupedItems ?? EMPTY_GROUPS;
  const loading = current?.loading ?? true;
  const error = current?.error ?? null;
  const selectedRecipeId = current?.selectedRecipeId ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId || !planId) return;

    let cancelled = false;

    async function load() {
      const empty: DetailState = { key, plan: null, items: [], groupedItems: {},
        loading: true, error: null, selectedRecipeId: null };
      setState(empty);

      try {
        const token = await tokenGetterRef.current();
        if (cancelled) return;
        if (!token) throw new Error('請先登入以查看餐單');
        const { plan: fetchedPlan, items: fetchedItems } = await getPlanDetail(planId, token);

        if (cancelled) return;

        const mappedItems = fetchedItems.map(mapPlanItemMealSlot);

        const grouped = mapPlanItemsByDay(fetchedPlan, mappedItems);
        setState({ ...empty, plan: fetchedPlan ?? null, items: mappedItems,
          groupedItems: grouped, loading: false });
      } catch (err) {
        if (!cancelled) {
          setState({ ...empty, loading: false, error: err instanceof Error ? err.message || '載入失敗' : '載入失敗' });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [key, planId, isAuthenticated, userId]);

  
  // Each day's items bucketed by canonical mealSlot, in display order.
  const mealSlotGroupsByDay = useMemo(() => mapPlanDaysByMealSlot(groupedItems), [groupedItems]);

  const handleRecipeClick = (id: string | number) => {
    const recipeId = String(id);
    if (!recipeId) return;
    
    setState(previous => previous?.key === key && previous.plan
      ? { ...previous, selectedRecipeId: recipeId } : previous);
  };

  const handleCloseModal = () => {
    setState(previous => previous?.key === key
      ? { ...previous, selectedRecipeId: null } : previous);
  };

  // One id per saved meal: a recipe planned on several days or slots is sent
  // once per occurrence, and /api/shopping-list counts the repeats.
  const recipeIds = items.map(i => i.recipe_id).filter(Boolean);

  const recipeServings = items.filter(i => i.recipe_id).map(i => i.servings ?? 1);

  const avgServings =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + (i.servings || 1), 0) / items.length)
      : 1;

  return {
    plan,
    items,
    groupedItems,
    mealSlotGroupsByDay,

    recipeIds,
    recipeServings,
    avgServings,

    loading,
    error,

    selectedRecipeId,

    handleRecipeClick,
    handleCloseModal
  };
}
