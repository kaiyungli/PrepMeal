// Get single menu plan with items - uses real schema: menu_plans, menu_plan_items

import { requireAuth, ApiResponse } from '../_auth';
import { mapPlanResponse, mapItemResponse, mapItemsWithRecipes } from '@/features/plans/mappers/mapMenuPlanResponse';
import { getMenuPlanDetail } from '@/features/plans/server/getMenuPlanDetail';
import { createUserSupabaseClient } from '@/lib/supabaseUserClient';

// GET failures are logged server-side; the client only ever gets this.
const GET_PLAN_ERROR = 'Failed to load plan';

// menu_plans.id is a uuid. Any other id can't name a plan, so it is a 404
// here rather than a uuid cast error from the database.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

      if (typeof planId !== 'string' || !UUID_RE.test(planId)) {
        return res.status(404).json(ApiResponse.notFound('Plan not found'));
      }
      
      // Get plan detail from server
      const { plan, items, recipes, error } = await getMenuPlanDetail(userSupabase, planId, userId);
      
      if (error) {
        console.error('[menus-api] get_plan_error', { planId, error });
        return res.status(500).json(ApiResponse.error(GET_PLAN_ERROR));
      }

      if (!plan) {
        return res.status(404).json(ApiResponse.notFound('Plan not found'));
      }
      
      // Map to response
      const planResponse = mapPlanResponse(plan);
      const itemsResponse = (items || []).map((item) => mapItemResponse(item, plan.start_date));
      const itemsWithRecipes = mapItemsWithRecipes(itemsResponse, recipes);
      
      return res.status(200).json(ApiResponse.success({ plan: planResponse, items: itemsWithRecipes }));
    }

    if (req.method === 'DELETE') {
      // The menu_plan_items FK cascades from menu_plans. A single parent DELETE
      // keeps the plan and its items in the same database transaction.
      try {
        const { data: deletedPlans, error: planError } = await userSupabase
          .from('menu_plans')
          .delete()
          .eq('id', planId)
          .eq('user_id', userId)
          .select('id');
        
        if (planError) {
          throw planError;
        }

        if (!deletedPlans?.length) {
          return res.status(404).json(ApiResponse.notFound('Plan not found'));
        }
        
        return res.status(200).json(ApiResponse.success({ deleted: true }));
      } catch (err) {
        return res.status(500).json(ApiResponse.error(err.message));
      }
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
  } catch (err) {
    if (req.method === 'GET') {
      console.error('[menus-api] get_plan_exception', { planId: req.query.id, error: err });
      return res.status(500).json(ApiResponse.error(GET_PLAN_ERROR));
    }
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}
