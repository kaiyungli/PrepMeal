// Get single menu plan with items - uses real schema: menu_plans, menu_plan_items

import { requireAuth, ApiResponse } from '../_auth';
import { mapPlanResponse, mapItemResponse, mapItemsWithRecipes } from '@/features/plans/mappers/mapMenuPlanResponse';
import { getMenuPlanDetail } from '@/features/plans/server/getMenuPlanDetail';
import { createUserSupabaseClient } from '@/lib/supabaseUserClient';

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json(ApiResponse.error('Missing Supabase config'));
  }
  
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    const userSupabase = createUserSupabaseClient({ supabaseUrl, anonKey: supabaseAnonKey, token });

    const planId = req.query.id;

    if (req.method === 'GET') {
      const getStart = Date.now();
      
      // Get plan detail from server
      const { plan, items, recipes, error } = await getMenuPlanDetail(userSupabase, planId, userId);
      
      if (error || !plan) {
        return res.status(404).json(ApiResponse.notFound('Plan not found'));
      }
      
      // Map to response
      const planResponse = mapPlanResponse(plan);
      const itemsResponse = (items || []).map((item) => mapItemResponse(item, plan.start_date));
      const itemsWithRecipes = mapItemsWithRecipes(itemsResponse, recipes);
      
      return res.status(200).json(ApiResponse.success({ plan: planResponse, items: itemsWithRecipes }));
    }

    if (req.method === 'DELETE') {
      // Use real tables: menu_plan_items, menu_plans
      try {
        // Delete items first
        const { error: itemsError } = await userSupabase
          .from('menu_plan_items')
          .delete()
          .eq('menu_plan_id', planId);
        
        if (itemsError) {
          throw itemsError;
        }
        
        // Delete plan
        const { error: planError } = await userSupabase
          .from('menu_plans')
          .delete()
          .eq('id', planId)
          .eq('user_id', userId);
        
        if (planError) {
          throw planError;
        }
        
        return res.status(200).json(ApiResponse.success({ deleted: true }));
      } catch (err) {
        return res.status(500).json(ApiResponse.error(err.message));
      }
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
  } catch (err) {
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}