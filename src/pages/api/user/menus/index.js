// Menu Plans API - GET, POST
// Unified contract using user-scoped Supabase client

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

    if (req.method === 'GET') {
      console.log('[Menus] GET - querying saved_menu_plans');
      
      const { data, error } = await userSupabase
        .from('saved_menu_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(error);
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      console.log('[Menus] GET data:', (data || []).length, 'plans');
      return res.status(200).json(ApiResponse.success({ plans: data || [] }));
    }

    if (req.method === 'POST') {
      const { name, week_start_date, days_count, items, notes } = req.body;
      
      if (!name || !week_start_date || !items || !Array.isArray(items)) {
        return res.status(400).json(ApiResponse.badRequest('name, week_start_date, and items are required'));
      }

      console.log('[Menus] POST - creating plan:', name);

      try {
        // Insert parent plan
        const { data: plan, error: planError } = await userSupabase
          .from('saved_menu_plans')
          .insert({
            user_id: userId,
            name,
            week_start_date,
            days_count: days_count || 7,
            notes: notes || null,
          })
          .select()
          .single();
        
        if (planError) {
          console.error('[Menus] POST plan error:', planError);
          throw planError;
        }

        // Insert items
        const itemsToInsert = items.map(item => ({
          menu_plan_id: plan.id,
          day_index: item.day_index,
          meal_type: item.meal_type,
          recipe_id: item.recipe_id,
          servings: item.servings || 1,
        }));

        const { error: itemsError } = await userSupabase
          .from('saved_menu_plan_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          console.error('[Menus] POST items error:', itemsError);
          throw itemsError;
        }

        console.log('[Menus] POST success - plan_id:', plan.id);
        return res.status(201).json(ApiResponse.created({ plan_id: plan.id }));
      } catch (err) {
        console.error('[Menus] POST error:', err);
        return res.status(500).json(ApiResponse.error(err.message));
      }
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
  } catch (err) {
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}