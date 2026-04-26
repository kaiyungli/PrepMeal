import { useEffect, useState, useRef } from 'react';
import { getPlanDetail } from '../services/getPlanDetail';
import { mapPlanItemsByDay } from '../mappers/mapPlanItemsByDay';

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

        setPlan(fetchedPlan);
        setItems(fetchedItems);

        const grouped = mapPlanItemsByDay(fetchedPlan, fetchedItems);
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

  const handleRecipeClick = (id: string) => {
    setSelectedRecipeId(id);
  };

  const handleCloseModal = () => {
    setSelectedRecipeId(null);
  };

  const recipeIds = [...new Set(items.map(i => i.recipe_id).filter(Boolean))];

  const avgServings =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + (i.servings || 1), 0) / items.length)
      : 1;

  return {
    plan,
    items,
    groupedItems,

    recipeIds,
    avgServings,

    loading,
    error,

    selectedRecipeId,

    handleRecipeClick,
    handleCloseModal
  };
}