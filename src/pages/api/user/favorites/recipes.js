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
  
  // === DIAGNOSTICS ===
  console.log('[FavoritesRecipesAPI] Authorization header exists:', !!req.headers.authorization);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[FavoritesRecipesAPI] Missing Supabase config');
    return res.status(500).json(ApiResponse.error('Missing Supabase config'));
  }
  
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7);
  
  const userId = await requireAuth(req, res);
  if (!userId) {
    console.log('[FavoritesRecipesAPI] requireAuth returned null');
    return;
  }
  
  console.log('[FavoritesRecipesAPI] Resolved userId:', userId);
  
  const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, token);

  if (req.method === 'GET') {
    // Get favorite recipe IDs
    console.log('[FavoritesRecipesAPI] GET - querying user_favorites');
    const { data: favorites, error } = await userSupabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', userId);
    
    // === DIAGNOSTICS ===
    if (error) {
      console.error('[FavoritesRecipesAPI] GET favorites error:', error);
    } else {
      console.log('[FavoritesRecipesAPI] Favorite recipe_ids found:', (favorites || []).length);
    }
    
    if (error) {
      return res.status(500).json(ApiResponse.error(error.message));
    }
    
    const recipeIds = (favorites || []).map(f => f.recipe_id);
    console.log('[FavoritesRecipesAPI] Recipe IDs to fetch:', recipeIds.length);
    
    if (recipeIds.length === 0) {
      return res.status(200).json(ApiResponse.success({ recipes: [] }));
    }
    
    // Get recipe details
    console.log('[FavoritesRecipesAPI] GET - querying recipes');
    const { data: recipes, error: recipeError } = await userSupabase
      .from('recipes')
      .select('id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,cook_time_minutes,prep_time_minutes,calories_per_serving,protein_g,carbs_g,fat_g,primary_protein,protein,dish_type,diet,description,is_public,created_at')
      .in('id', recipeIds)
      .eq('is_public', true);
    
    // === DIAGNOSTICS ===
    if (recipeError) {
      console.error('[FavoritesRecipesAPI] GET recipes error:', recipeError);
    } else {
      console.log('[FavoritesRecipesAPI] Recipes returned:', recipes?.length || 0);
    }
    
    if (recipeError) {
      return res.status(500).json(ApiResponse.error(recipeError.message));
    }
    
    return res.status(200).json(ApiResponse.success({ recipes: recipes || [] }));
  }

  return res.status(405).json(ApiResponse.methodNotAllowed());
}