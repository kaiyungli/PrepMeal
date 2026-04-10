import { useEffect, useState } from 'react';
import { getPlanDetail } from '../services/getPlanDetail';
import { mapPlanItemsByDay } from '../mappers/mapPlanItemsByDay';

interface UsePlanDetailControllerOptions {
  planId: string;
  isAuthenticated: boolean;
  getAccessToken: () => Promise<string | null>;
}

export function usePlanDetailController({
  planId,
  isAuthenticated,
  getAccessToken
}: UsePlanDetailControllerOptions) {
  const [plan, setPlan] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<number, any[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !planId) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();
        const { plan, items } = await getPlanDetail(planId, token || undefined);

        if (!mounted) return;

        setPlan(plan);
        setItems(items);

        const grouped = mapPlanItemsByDay(plan, items);
        setGroupedItems(grouped);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || '載入失敗');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [planId, isAuthenticated, getAccessToken]);

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