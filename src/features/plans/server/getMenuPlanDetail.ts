/**
 * Get menu plan detail with items and recipe details
 * Server-side function - returns raw DB data, no response shaping
 */

// `.single()` reports "no row" as an error, PGRST116. Filtered by id and
// user_id, that means the plan doesn't exist or isn't this user's. Every other
// error is a failed read, not a missing plan.
const PLAN_NOT_FOUND_CODE = 'PGRST116';

/**
 * Returns one of:
 * - { plan, items, recipes, error: null }  loaded; recipes omitted by RLS are simply absent
 * - { plan: null, ..., error: null }       plan not found
 * - { ..., error }                         a query failed
 */
// Use any for supabase client to avoid complex type matching
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMenuPlanDetail(supabase: any, planId: string, userId: string) {
  // Get plan
  const { data: plan, error: planError } = await supabase
    .from('menu_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();
  
  if (planError && planError.code !== PLAN_NOT_FOUND_CODE) {
    return { plan: null, items: null, recipes: null, error: planError };
  }

  if (!plan) {
    return { plan: null, items: null, recipes: null, error: null };
  }
  
  // Get items ordered by date then item_order
  const { data: items, error: itemsError } = await supabase
    .from('menu_plan_items')
    .select('*')
    .eq('menu_plan_id', planId)
    .order('date', { ascending: true })
    .order('item_order', { ascending: true });
  
  if (itemsError) {
    return { plan, items: null, recipes: null, error: itemsError };
  }
  
  // Get recipe IDs and fetch details
  const itemsList = items || [];
  const recipeIds = itemsList.map((item: { recipe_id: string | null }) => item.recipe_id).filter(Boolean);
  
  let recipes: unknown[] = [];
  
  if (recipeIds.length > 0) {
    const { data: recipeData, error: recipesError } = await supabase
      .from('recipes')
      .select('id, name, image_url, total_time_minutes, calories_per_serving, difficulty, method')
      .in('id', recipeIds);

    // A failed lookup must not look like every recipe being hidden by RLS.
    if (recipesError) {
      return { plan, items: null, recipes: null, error: recipesError };
    }
    
    recipes = recipeData || [];
  }
  
  return { plan, items: itemsList, recipes, error: null };
}
