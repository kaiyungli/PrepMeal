// Get favorite recipes - returns full recipe objects
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
  
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7);
  
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, token);

  if (req.method === 'GET') {
    // Get favorite recipe IDs
    const { data: favorites, error } = await userSupabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', userId);
    
    if (error) {
      return res.status(500).json(ApiResponse.error(error.message));
    }
    
    const recipeIds = (favorites || []).map(f => f.recipe_id);
    
    if (recipeIds.length === 0) {
      return res.status(200).json(ApiResponse.success({ recipes: [] }));
    }
    
    // Get recipe details
    const { data: recipes, error: recipeError } = await userSupabase
      .from('recipes')
      .select('id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,cook_time_minutes,prep_time_minutes,calories_per_serving,protein_g,carbs_g,fat_g,primary_protein,protein,dish_type,diet,description,is_public,created_at')
      .in('id', recipeIds)
      .eq('is_public', true);
    
    if (recipeError) {
      return res.status(500).json(ApiResponse.error(recipeError.message));
    }
    
    return res.status(200).json(ApiResponse.success({ recipes: recipes || [] }));
  }

  return res.status(405).json(ApiResponse.methodNotAllowed());
}