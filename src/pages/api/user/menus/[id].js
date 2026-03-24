// Get single menu plan with items - token-based auth only
import supabase from '@/lib/supabase';
import { requireAuth, ApiResponse } from '../_auth';

export default async function handler(req, res) {
  // Require auth
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  console.log('[MenuDetail] UserId:', userId);

  const planId = req.query.id;

  if (req.method === 'GET') {
    console.log('[MenuDetail] GET - fetching plan:', planId);
    
    try {
      // Get the plan
      const { data: plan, error: planError } = await supabase
        .from('saved_menu_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single();
      
      if (planError || !plan) {
        console.error('[MenuDetail] Plan error:', planError);
        return res.status(404).json(ApiResponse.notFound('Plan not found'));
      }
      
      // Get items
      const { data: items, error: itemsError } = await supabase
        .from('saved_menu_plan_items')
        .select('*')
        .eq('menu_plan_id', planId);
      
      if (itemsError) {
        console.error('[MenuDetail] Items error:', itemsError);
        return res.status(500).json(ApiResponse.error(itemsError.message));
      }
      
      // Get recipe details
      const recipeIds = items.map(i => i.recipe_id).filter(Boolean);
      let recipesMap = {};
      
      if (recipeIds.length > 0) {
        const { data: recipes } = await supabase
          .from('recipes')
          .select('id, name, image_url, total_time_minutes, difficulty, method')
          .in('id', recipeIds);
        
        if (recipes) {
          recipesMap = recipes.reduce((acc, r) => {
            acc[r.id] = r;
            return acc;
          }, {});
        }
      }
      
      // Attach recipe details
      const itemsWithRecipes = items.map(item => ({
        ...item,
        recipe: item.recipe_id ? recipesMap[item.recipe_id] : null,
      }));
      
      console.log('[MenuDetail] GET success');
      return res.status(200).json(ApiResponse.success({ plan, items: itemsWithRecipes }));
    } catch (err) {
      console.error('[MenuDetail] GET error:', err);
      return res.status(500).json(ApiResponse.error(err.message));
    }
  }

  if (req.method === 'DELETE') {
    console.log('[MenuDetail] DELETE - plan:', planId);
    
    try {
      // Delete items first
      const { error: itemsError } = await supabase
        .from('saved_menu_plan_items')
        .delete()
        .eq('menu_plan_id', planId);
      
      if (itemsError) {
        console.error('[MenuDetail] Delete items error:', itemsError);
        return res.status(500).json(ApiResponse.error(itemsError.message));
      }
      
      // Delete plan
      const { error: planError } = await supabase
        .from('saved_menu_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', userId);
      
      if (planError) {
        console.error('[MenuDetail] Delete plan error:', planError);
        return res.status(500).json(ApiResponse.error(planError.message));
      }
      
      console.log('[MenuDetail] DELETE success');
      return res.status(200).json(ApiResponse.success({ deleted: true }));
    } catch (err) {
      console.error('[MenuDetail] DELETE error:', err);
      return res.status(500).json(ApiResponse.error(err.message));
    }
  }

  return res.status(405).json(ApiResponse.methodNotAllowed());
}
