// Favorites API - GET, POST, DELETE
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
  
  // === DIAGNOSTICS ===
  console.log('[FavoritesAPI] Method:', req.method);
  console.log('[FavoritesAPI] Authorization header exists:', !!req.headers.authorization);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[FavoritesAPI] Missing Supabase config');
    return res.status(500).json(ApiResponse.error('Missing Supabase config'));
  }
  
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    
    const userId = await requireAuth(req, res);
    if (!userId) {
      console.log('[FavoritesAPI] requireAuth returned null');
      return;
    }
    
    console.log('[FavoritesAPI] Resolved userId:', userId);
    
    const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, token);

    if (req.method === 'GET') {
      console.log('[FavoritesAPI] GET - querying user_favorites');
      const { data, error } = await userSupabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      // === DIAGNOSTICS ===
      if (error) {
        console.error('[FavoritesAPI] GET Supabase error:', error);
      } else {
        console.log('[FavoritesAPI] GET success, rows:', data?.length || 0);
      }
      
      if (error) {
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      const favorites = (data || []).map(f => f.recipe_id);
      return res.status(200).json(ApiResponse.success({ favorites }));
    }

    if (req.method === 'POST') {
      const { recipe_id } = req.body;
      
      // === DIAGNOSTICS ===
      console.log('[FavoritesAPI] POST - recipe_id:', recipe_id);
      
      if (!recipe_id) {
        return res.status(400).json(ApiResponse.badRequest('recipe_id required'));
      }
      
      const { error } = await userSupabase
        .from('user_favorites')
        .insert({ user_id: userId, recipe_id });
      
      // === DIAGNOSTICS ===
      if (error) {
        console.error('[FavoritesAPI] POST Supabase error:', error);
      } else {
        console.log('[FavoritesAPI] POST success');
      }
      
      if (error) {
        if (error.code === '23505') {
          return res.status(200).json(ApiResponse.success({ message: 'Already favorited' }));
        }
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      return res.status(201).json(ApiResponse.created({ recipe_id }));
    }

    if (req.method === 'DELETE') {
      const { recipe_id } = req.query;
      
      // === DIAGNOSTICS ===
      console.log('[FavoritesAPI] DELETE - recipe_id:', recipe_id);
      
      if (!recipe_id) {
        return res.status(400).json(ApiResponse.badRequest('recipe_id required'));
      }
      
      const { error } = await userSupabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipe_id);
      
      // === DIAGNOSTICS ===
      if (error) {
        console.error('[FavoritesAPI] DELETE Supabase error:', error);
      } else {
        console.log('[FavoritesAPI] DELETE success');
      }
      
      if (error) {
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      return res.status(200).json(ApiResponse.success({ recipe_id }));
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
    
  } catch (err) {
    console.error('[FavoritesAPI] Catch error:', err);
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}