// Favorites API - GET, POST, DELETE
// Unified contract using _auth helper

import supabase from '@/lib/supabase';
import { requireAuth, ApiResponse } from '../_auth';

export default async function handler(req, res) {
  try {
    // Require auth for all methods
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    console.log('[Favorites] UserId:', userId);

    if (req.method === 'GET') {
      console.log('[Favorites] GET - querying user_favorites');
      
      const { data, error } = await supabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      if (error) {
        console.error('[Favorites] GET error:', error);
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
      
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: userId, recipe_id });
      
      if (error) {
        console.error('[Favorites] POST error:', error);
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
      
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipe_id);
      
      if (error) {
        console.error('[Favorites] DELETE error:', error);
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
