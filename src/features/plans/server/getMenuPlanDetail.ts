/**
 * Get menu plan detail with items and recipe details
 * Server-side function - returns raw DB data, no response shaping
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
  
  if (planError || !plan) {
    return { plan: null, items: null, error: planError };
  }
  
  // Get items ordered by date then item_order
  const { data: items, error: itemsError } = await supabase
    .from('menu_plan_items')
    .select('*')
    .eq('menu_plan_id', planId)
    .order('date', { ascending: true })
    .order('item_order', { ascending: true });
  
  if (itemsError) {
    return { plan, items: null, error: itemsError };
  }
  
  // Get recipe IDs and fetch details
  const itemsList = items || [];
  const recipeIds = itemsList.map((item: { recipe_id: string | null }) => item.recipe_id).filter(Boolean);
  
  let recipes: unknown[] = [];
  
  if (recipeIds.length > 0) {
    const { data: recipeData } = await supabase
      .from('recipes')
      .select('id, name, image_url, total_time_minutes, difficulty, method')
      .in('id', recipeIds);
    
    recipes = recipeData || [];
  }
  
  return { plan, items: itemsList, recipes };
}
