/**
 * Menu plan response mapper
 * Pure transformation functions - no side effects, no DB access
 */

/**
 * Transform DB menu_plans row to frontend-safe plan object
 */
export function mapPlanResponse(plan: {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}) {
  const endDate = plan.end_date;
  const startDate = plan.start_date;
  const daysCount = endDate && startDate
    ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 7;
  
  return {
    id: plan.id,
    user_id: plan.user_id,
    name: plan.title,
    week_start_date: startDate,
    days_count: daysCount,
    notes: null,
    created_at: plan.created_at,
  };
}

/**
 * Transform DB menu_plan_items row to frontend-safe item object
 */
export function mapItemResponse(
  item: {
    id: string;
    menu_plan_id: string;
    date: string;
    meal_slot: string;
    recipe_id: string | null;
    servings: number;
    item_order: number;
    source: string;
  },
  startDate: string
) {
  const itemDate = item.date;
  const dayIndex = itemDate && startDate
    ? Math.round((new Date(itemDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  return {
    id: item.id,
    menu_plan_id: item.menu_plan_id,
    date: itemDate,
    day_index: dayIndex,
    meal_type: item.meal_slot,
    recipe_id: item.recipe_id,
    servings: item.servings,
    item_order: item.item_order,
    source: item.source,
  };
}

/**
 * Map recipe details to items
 */
export function mapItemsWithRecipes(
  items: Array<{
    id: string;
    menu_plan_id: string;
    date: string;
    day_index: number;
    meal_type: string;
    recipe_id: string | null;
    servings: number;
    item_order: number;
    source: string;
  }>,
  recipes: Array<{
    id: string;
    name: string;
    image_url: string | null;
    total_time_minutes: number | null;
    difficulty: string | null;
    method: string | null;
  }> | null
) {
  if (!recipes || recipes.length === 0) {
    return items.map((item) => ({ ...item, recipe: null }));
  }
  
  // Build recipe lookup map
  const recipeMap: Record<string, typeof recipes[0]> = {};
  for (const r of recipes) {
    recipeMap[r.id] = r;
  }

  // Attach recipe details to each item
  return items.map((item) => ({
    ...item,
    recipe: item.recipe_id ? recipeMap[item.recipe_id] : null,
  }));
}
