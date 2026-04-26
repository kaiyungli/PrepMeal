// Favorites API - GET, POST, DELETE
import { createClient } from '@supabase/supabase-js';
import { requireAuth, ApiResponse } from '../_auth';

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
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, token);

    // GET: Use service role client (faster, bypasses RLS)
    if (req.method === 'GET') {
      if (!serverSupabase) {
        return res.status(500).json(ApiResponse.error('Service role client not configured'));
      }
      
      const start = Date.now();
      console.log('[favorites-api] get_start', { userId });
      
      const { data, error } = await serverSupabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      console.log('[favorites-api] get_query_done', {
        duration_ms: Date.now() - start,
        count: (data || []).length
      });
      
      if (error) {
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      const favorites = (data || []).map(f => f.recipe_id);
      return res.status(200).json(ApiResponse.success({ favorites }));
    }

    // POST: Use user client (needs user token for RLS)
    if (req.method === 'POST') {
      const { recipe_id } = req.body;
      
      if (!recipe_id) {
        return res.status(400).json(ApiResponse.badRequest('recipe_id required'));
      }
      
      const { error } = await userSupabase
        .from('user_favorites')
        .insert({ user_id: userId, recipe_id });
      
      if (error) {
        if (error.code === '23505') {
          return res.status(200).json(ApiResponse.success({ message: 'Already favorited' }));
        }
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      return res.status(201).json(ApiResponse.created({ recipe_id }));
    }

    // DELETE: Use user client (needs user token for RLS ownership check)
    if (req.method === 'DELETE') {
      const { recipe_id } = req.query;
      
      if (!recipe_id) {
        return res.status(400).json(ApiResponse.badRequest('recipe_id required'));
      }
      
      const { error } = await userSupabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipe_id);
      
      if (error) {
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      return res.status(200).json(ApiResponse.success({ recipe_id }));
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
    
  } catch (err) {
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}