// Get single menu plan with items - uses real schema: menu_plans, menu_plan_items

import { createClient } from '@supabase/supabase-js';
import { requireAuth, ApiResponse } from '../_auth';

function createUserClient(supabaseUrl, anonKey, token) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

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
    
    const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, token);

    const planId = req.query.id;

    if (req.method === 'GET') {
      const getStart = Date.now();
      console.log('[menus-api] detail_start', { userId, planId });
      
      const planStart = Date.now();
      const { data: plan, error: planError } = await userSupabase
        .from('menu_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single();
      
      console.log('[menus-api] detail_plan_done', {
        duration_ms: Date.now() - planStart,
        hasPlan: Boolean(plan)
      });
      
      if (planError || !plan) {
        return res.status(404).json(ApiResponse.notFound('Plan not found'));
      }
      
      // Transform DB fields to frontend-safe response
      const planResponse = {
        id: plan.id,
        user_id: plan.user_id,
        name: plan.title,
        week_start_date: plan.start_date,
        days_count: plan.end_date && plan.start_date 
          ? (new Date(plan.end_date) - new Date(plan.start_date)) / (1000 * 60 * 60 * 24) + 1 
          : 7,
        notes: null,
        created_at: plan.created_at,
      };
      
      const itemsStart = Date.now();
      const { data: items, error: itemsError } = await userSupabase
        .from('menu_plan_items')
        .select('*')
        .eq('menu_plan_id', planId)
        .order('date', { ascending: true })
        .order('item_order', { ascending: true });
      
      console.log('[menus-api] detail_items_done', {
        duration_ms: Date.now() - itemsStart,
        itemCount: (items || []).length
      });
      
      if (itemsError) {
        return res.status(500).json(ApiResponse.error(itemsError.message));
      }
      
      // Transform items to frontend-safe response
      const itemsResponse = (items || []).map(item => ({
        id: item.id,
        menu_plan_id: item.menu_plan_id,
        date: item.date,
        day_index: item.date && plan.start_date 
          ? (new Date(item.date) - new Date(plan.start_date)) / (1000 * 60 * 60 * 24)
          : 0,
        meal_type: item.meal_slot,
        recipe_id: item.recipe_id,
        servings: item.servings,
        item_order: item.item_order,
        source: item.source,
      }));
      
      // Get recipe details
      const recipeIds = itemsResponse.map(i => i.recipe_id).filter(Boolean);
      let recipesMap = {};
      
      if (recipeIds.length > 0) {
        const recipesStart = Date.now();
        const { data: recipes } = await userSupabase
          .from('recipes')
          .select('id, name, image_url, total_time_minutes, difficulty, method')
          .in('id', recipeIds);
        
        console.log('[menus-api] detail_recipes_done', {
          duration_ms: Date.now() - recipesStart,
          recipeCount: (recipes || []).length
        });
        
        if (recipes) {
          recipesMap = recipes.reduce((acc, r) => {
            acc[r.id] = r;
            return acc;
          }, {});
        }
      }
      
      // Attach recipe details
      const itemsWithRecipes = itemsResponse.map(item => ({
        ...item,
        recipe: item.recipe_id ? recipesMap[item.recipe_id] : null,
      }));
      
      console.log('[menus-api] detail_total_done', {
        duration_ms: Date.now() - getStart,
        itemCount: itemsWithRecipes.length
      });
      
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