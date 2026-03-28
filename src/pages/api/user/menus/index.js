// Menu Plans API - GET, POST
// Uses real database schema: menu_plans, menu_plan_items

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
      // Use real table: menu_plans
      const { data, error } = await userSupabase
        .from('menu_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      // Transform DB fields to frontend-safe response
      const plans = (data || []).map(plan => ({
        id: plan.id,
        user_id: plan.user_id,
        name: plan.title,
        week_start_date: plan.start_date,
        days_count: plan.end_date && plan.start_date 
          ? (new Date(plan.end_date) - new Date(plan.start_date)) / (1000 * 60 * 60 * 24) + 1 
          : 7,
        notes: plan.notes,
        created_at: plan.created_at,
      }));
      
      return res.status(200).json(ApiResponse.success({ plans }));
    }

    if (req.method === 'POST') {
      const { name, week_start_date, days_count, items, notes } = req.body;
      
      if (!name || !week_start_date || !items || !Array.isArray(items)) {
        return res.status(400).json(ApiResponse.badRequest('name, week_start_date, and items are required'));
      }

      try {
        // Compute end_date from week_start_date + days_count
        const startDate = new Date(week_start_date);
        const days = days_count || 7;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);
        const end_date = endDate.toISOString().split('T')[0];

        // Insert parent plan using real schema: menu_plans
        // Maps: name → title, week_start_date → start_date, days_count → end_date
        const { data: plan, error: planError } = await userSupabase
          .from('menu_plans')
          .insert({
            user_id: userId,
            title: name,
            start_date: week_start_date,
            end_date: end_date,
            notes: notes || null,
          })
          .select()
          .single();
        
        if (planError) {
          throw planError;
        }

        // Insert items using real schema: menu_plan_items
        // Maps:
        // - day_index + week_start_date → date
        // - meal_type → meal_slot
        // - servings → servings
        // - recipe_id → recipe_id
        // - add item_order and source
        const itemsToInsert = items.map((item, index) => {
          const itemDate = new Date(week_start_date);
          itemDate.setDate(itemDate.getDate() + (item.day_index || 0));
          return {
            menu_plan_id: plan.id,
            date: itemDate.toISOString().split('T')[0],
            meal_slot: item.meal_type || 'dinner',
            recipe_id: item.recipe_id,
            servings: item.servings || 1,
            item_order: index + 1,
            source: 'generated',
          };
        });

        const { error: itemsError } = await userSupabase
          .from('menu_plan_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          throw itemsError;
        }

        return res.status(201).json(ApiResponse.created({ plan_id: plan.id }));
      } catch (err) {
        return res.status(500).json(ApiResponse.error(err.message));
      }
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
  } catch (err) {
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}