interface MenuPlanItem {
  id?: number | string;
  date?: string;
  meal_slot?: string;
  servings?: number;
  item_order?: number;
  recipe_id?: number | string;
  recipes?: {
    id: number | string;
    name?: string;
    image_url?: string;
  };
  recipe?: {
    id: number | string;
    name?: string;
    image_url?: string;
  };
}

interface MenuPlanSummary {
  item_count: number;
  avg_servings: number;
  preview_items: Array<{
    id?: number | string | null;
    date?: string;
    meal_slot?: string;
    servings?: number;
    recipe?: {
      id?: number | string;
      name?: string;
      image_url?: string;
    } | null;
  }>;
}

export function buildMenuPlanSummary(items: MenuPlanItem[] = []): MenuPlanSummary {
  const normalizedItems = Array.isArray(items) ? items : [];

  const itemCount = normalizedItems.length;

  const servingsValues = normalizedItems
    .map(item => Number(item.servings || 1))
    .filter(value => Number.isFinite(value) && value > 0);

  const avgServings = servingsValues.length > 0
    ? Math.round(servingsValues.reduce((sum, v) => sum + v, 0) / servingsValues.length)
    : 2;

  const sortedItems = [...normalizedItems].sort((a, b) => {
    const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
    if (dateCompare !== 0) return dateCompare;
    return Number(a.item_order || 0) - Number(b.item_order || 0);
  });

  const firstDate = sortedItems[0]?.date;
  const firstDayItems = firstDate
    ? sortedItems.filter(item => item.date === firstDate)
    : [];

  const previewItems = firstDayItems
    .sort((a, b) => Number(a.item_order || 0) - Number(b.item_order || 0))
    .slice(0, 2)
    .map(item => ({
      id: item.id || null,
      date: item.date,
      meal_slot: item.meal_slot,
      servings: item.servings,
      recipe: item.recipes
        ? {
            id: item.recipes.id,
            name: item.recipes.name,
            image_url: item.recipes.image_url,
          }
        : item.recipe || null,
    }));

  return {
    item_count: itemCount,
    avg_servings: avgServings,
    preview_items: previewItems,
  };
}