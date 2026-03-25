// Favorites API - GET, POST, DELETE
// Unified contract using _auth helper

import { createClient } from '@supabase/supabase-js';
import { requireAuth, ApiResponse } from '../_auth';

// Create a Supabase client with the user's JWT token
// This allows RLS policies to work correctly
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
    const start = Date.now();
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    console.log('[Favorites] Token parse:', Date.now() - start, 'ms');
    
    // Require auth for all methods
    const authStart = Date.now();
    const userId = await requireAuth(req, res);
    console.log('[Favorites] requireAuth:', Date.now() - authStart, 'ms');
    if (!userId) return;
    
    console.log('[Favorites] UserId:', userId);
    
    // Create user-scoped client with token for RLS
    const clientStart = Date.now();
    const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, token);
    console.log('[Favorites] Client create:', Date.now() - clientStart, 'ms');

    if (req.method === 'GET') {
      const queryStart = Date.now();
      console.log('[Favorites] GET - querying user_favorites');
      
      const { data, error } = await userSupabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      console.log('[Favorites] Query execute:', Date.now() - queryStart, 'ms');
      
      if (error) {
        console.error('[Favorites] GET error:', error.message, error.code, error.details);
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      const favorites = (data || []).map(f => f.recipe_id);
      console.log('[Favorites] GET data:', favorites.length, 'records');
      return res.status(200).json(ApiResponse.success({ favorites }));
    }

    if (req.method === 'POST') {
      const { recipe_id } = req.body;
      
      if (!recipe_id) {
        return res.status(400).json(ApiResponse.badRequest('recipe_id required'));
      }
      
      console.log('[Favorites] POST - adding:', recipe_id);
      
      const { error } = await userSupabase
        .from('user_favorites')
        .insert({ user_id: userId, recipe_id });
      
      if (error) {
        console.error('[Favorites] POST error:', error.message, error.code, error.details, error.hint);
        if (error.code === '23505') {
          return res.status(200).json(ApiResponse.success({ message: 'Already favorited' }));
        }
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      return res.status(201).json(ApiResponse.created({ recipe_id }));
    }

    if (req.method === 'DELETE') {
      const { recipe_id } = req.query;
      
      if (!recipe_id) {
        return res.status(400).json(ApiResponse.badRequest('recipe_id required'));
      }
      
      console.log('[Favorites] DELETE - removing:', recipe_id);
      
      const { error } = await userSupabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipe_id);
      
      if (error) {
        console.error('[Favorites] DELETE error:', error.message, error.code, error.details);
        return res.status(500).json(ApiResponse.error(error.message));
      }
      
      return res.status(200).json(ApiResponse.success({ recipe_id }));
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
    
  } catch (err) {
    console.error('[Favorites] Unexpected error:', err);
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}
