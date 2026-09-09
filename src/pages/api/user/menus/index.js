// Menu Plans API - GET, POST
// Uses real database schema: menu_plans, menu_plan_items

import { createClient } from '@supabase/supabase-js';
import { requireAuth, ApiResponse } from '../_auth';

function createUserClient(supabaseUrl, anonKey, token) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// Service role client for server-side DB access (bypasses RLS)
const serverSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

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
      if (!serverSupabase) {
        return res.status(500).json(ApiResponse.error('Service role client not configured'));
      }
      
      const { data: plansData, error: plansError } = await serverSupabase
        .from('menu_plans')
        .select(`
          id,
          user_id,
          title,
          start_date,
          end_date,
          created_at,
          avg_servings,
          item_count,
          preview_items
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (plansError) {
        console.error('[menus-api] list_plans_error', {
          message: plansError.message,
          code: plansError.code,
          details: plansError.details,
          hint: plansError.hint
        });
        return res.status(500).json(ApiResponse.error(plansError.message));
      }
      
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
        updated_at: plan.created_at,
        item_count: plan.item_count || 0,
        avg_servings: plan.avg_servings || 2,
        items: Array.isArray(plan.preview_items) ? plan.preview_items : []
      }));
      
      return res.status(200).json(ApiResponse.success({ plans }));
    }

    if (req.method === 'POST') {
      const { name, week_start_date, days_count, items } = req.body || {};
      
      if (
        typeof name !== 'string' ||
        typeof week_start_date !== 'string' ||
        !Number.isInteger(days_count) ||
        !Array.isArray(items)
      ) {
        return res.status(400).json(ApiResponse.badRequest('name, week_start_date, and items are required'));
      }

      try {
        const { data: planId, error: planError } = await userSupabase.rpc(
          'create_menu_plan_atomic',
          {
            p_name: name,
            p_week_start_date: week_start_date,
            p_days_count: days_count,
            p_items: items,
          }
        );

        if (planError) throw planError;

        return res.status(201).json(ApiResponse.created({ plan_id: planId }));
      } catch (err) {
        if (['22023', '22P02', '23503', '23514'].includes(err?.code)) {
          return res.status(400).json(ApiResponse.badRequest(err.message));
        }
        return res.status(500).json(ApiResponse.error(err.message));
      }
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
  } catch (err) {
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}
