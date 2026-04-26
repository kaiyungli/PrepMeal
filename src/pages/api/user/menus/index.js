// Menu Plans API - GET, POST
// Uses real database schema: menu_plans, menu_plan_items

import { createClient } from '@supabase/supabase-js';
import { requireAuth, ApiResponse } from '../_auth';
import { transformItemsToInsert } from '@/lib/menuItemTransform';

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
    const authStart = Date.now();
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    console.log('[menus-api] auth_done', {
      duration_ms: Date.now() - authStart,
      hasUserId: Boolean(userId)
    });
    
    const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, token);

    if (req.method === 'GET') {
      const getStart = Date.now();
      console.log('[menus-api] list_start', { userId });
      
      console.log('[menus-api] list_plans_query_start');
      const plansStart = Date.now();
      const { data: plansData, error: plansError } = await userSupabase
        .from('menu_plans')
        .select(`
          id,
          user_id,
          title,
          start_date,
          end_date,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      console.log('[menus-api] list_plans_done', {
        duration_ms: Date.now() - plansStart,
        count: (plansData || []).length
      });
      
      if (plansError) {
        console.error('[menus-api] list_plans_error', {
          message: plansError.message,
          code: plansError.code,
          details: plansError.details,
          hint: plansError.hint
        });
        return res.status(500).json(ApiResponse.error(plansError.message));
      }
      
      // Fetch items for all plans
      const planIds = (plansData || []).map(p => p.id);
      let itemsData = [];
      if (planIds.length > 0) {
        console.log('[menus-api] list_items_query_start');
        const itemsStart = Date.now();
        const { data: items, error: itemsError } = await userSupabase
          .from('menu_plan_items')
          .select(`
            id,
            menu_plan_id,
            date,
            meal_slot,
            servings,
            item_order,
            recipe_id,
            recipes (
              id,
              name,
              image_url
            )
          `)
          .in('menu_plan_id', planIds)
          .order('date', { ascending: true })
          .order('item_order', { ascending: true });
        
        console.log('[menus-api] list_items_done', {
          duration_ms: Date.now() - itemsStart,
          count: (items || []).length,
          planCount: planIds.length
        });
        
        if (!itemsError) {
          itemsData = items || [];
        }
      }
      
      // Group items by plan
      const itemsByPlan = {};
      for (const item of itemsData) {
        if (!itemsByPlan[item.menu_plan_id]) {
          itemsByPlan[item.menu_plan_id] = [];
        }
        itemsByPlan[item.menu_plan_id].push({
          id: item.id,
          date: item.date,
          meal_slot: item.meal_slot,
          servings: item.servings,
          recipe: item.recipes ? {
            id: item.recipes.id,
            name: item.recipes.name,
            image_url: item.recipes.image_url
          } : null
        });
      }
      
      // Transform DB fields to frontend-safe response
      const plans = (plansData || []).map(plan => ({
        id: plan.id,
        user_id: plan.user_id,
        name: plan.title,
        week_start_date: plan.start_date,
        days_count: plan.end_date && plan.start_date 
          ? (new Date(plan.end_date) - new Date(plan.start_date)) / (1000 * 60 * 60 * 24) + 1 
          : 7,
        notes: null,
        created_at: plan.created_at,
        updated_at: plan.updated_at || plan.created_at,
        items: itemsByPlan[plan.id] || []
      }));
      
      console.log('[menus-api] list_total_done', {
        duration_ms: Date.now() - getStart,
        planCount: plans.length
      });
      
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

        // Check if plan already exists for this user+week (upsert logic)
        const { data: existingPlan, error: existingPlanError } = await userSupabase
          .from('menu_plans')
          .select('id')
          .eq('user_id', userId)
          .eq('start_date', week_start_date)
          .maybeSingle();
        
        if (existingPlanError) {
          throw existingPlanError;
        }
        
        let planId;
        
        if (existingPlan) {
          // Update existing plan - delete old items first
          planId = existingPlan.id;
          
          const { error: deleteError } = await userSupabase
            .from('menu_plan_items')
            .delete()
            .eq('menu_plan_id', planId);
          
          if (deleteError) {
            throw deleteError;
          }
          
          // Update plan timestamp
          await userSupabase
            .from('menu_plans')
            .update({ title: name, end_date: end_date, updated_at: new Date().toISOString() })
            .eq('id', planId);
        } else {
          // Insert new plan
          const { data: plan, error: planError } = await userSupabase
            .from('menu_plans')
            .insert({
              user_id: userId,
              title: name,
              start_date: week_start_date,
              end_date: end_date,
            })
            .select()
            .single();
          
          if (planError) {
            throw planError;
          }
          planId = plan.id;
        }

        // Insert items using helper (computes item_order per group)
        const itemsToInsert = transformItemsToInsert(items, planId, week_start_date);

        const { error: itemsError } = await userSupabase
          .from('menu_plan_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          throw itemsError;
        }

        return res.status(201).json(ApiResponse.created({ plan_id: planId }));
      } catch (err) {
        return res.status(500).json(ApiResponse.error(err.message));
      }
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
  } catch (err) {
    console.log('[menus-api] list_failed', {
      duration_ms: Date.now(),
      message: err.message,
      stack: err.stack
    });
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}