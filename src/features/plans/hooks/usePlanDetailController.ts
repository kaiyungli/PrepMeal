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

export function usePlanDetailController({
  planId,
  isAuthenticated,
  userId,
  getAccessToken
}: UsePlanDetailControllerOptions) {
  const [plan, setPlan] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<number, any[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Track fetched key to prevent refetch on session refresh
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !planId) return;

    const fetchKey = `${userId || 'unknown'}:${planId}`;

    // Prevent refetch for same user+plan after tab focus/session refresh
    if (fetchedKeyRef.current === fetchKey && plan) {
      return;
    }

    let cancelled = false;

    async function load() {
      if (!plan) setLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();
        const { plan: fetchedPlan, items: fetchedItems } = await getPlanDetail(planId, token || undefined);

        if (cancelled) return;

        const mappedItems = fetchedItems.map(mapPlanItemMealSlot);

        setPlan(fetchedPlan);
        setItems(mappedItems);

        const grouped = mapPlanItemsByDay(fetchedPlan, mappedItems);
        setGroupedItems(grouped);
        fetchedKeyRef.current = fetchKey;
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '載入失敗');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [planId, isAuthenticated, userId]);

  
  // Each day's items bucketed by canonical mealSlot, in display order.
  const mealSlotGroupsByDay = useMemo(() => mapPlanDaysByMealSlot(groupedItems), [groupedItems]);

  const handleRecipeClick = (id: string | number) => {
    const recipeId = String(id);
    if (!recipeId) return;
    
    setSelectedRecipeId(recipeId);
  };

  const handleCloseModal = () => {
    setSelectedRecipeId(null);
  };

  // One id per saved meal: a recipe planned on several days or slots is sent
  // once per occurrence, and /api/shopping-list counts the repeats.
  const recipeIds = items.map(i => i.recipe_id).filter(Boolean);

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
    avgServings,

    loading,
    error,

    selectedRecipeId,

    handleRecipeClick,
    handleCloseModal
  };
}
