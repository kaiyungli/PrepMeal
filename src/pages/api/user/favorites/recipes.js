// Get favorite recipes - returns full recipe objects
import supabase from '@/lib/supabase';
import { requireAuth, ApiResponse } from '../_auth';

export default async function handler(req, res) {
  // Require auth
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  console.log('[FavoriteRecipes] UserId:', userId);

  if (req.method === 'GET') {
    console.log('[FavoriteRecipes] GET - fetching favorite recipes');
    
    // Get favorite recipe IDs
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error('[FavoriteRecipes] GET favorites error:', error);
      return res.status(500).json(ApiResponse.error(error.message));
    }
    
    const recipeIds = (favorites || []).map(f => f.recipe_id);
    console.log('[FavoriteRecipes] Favorite IDs:', recipeIds.length);
    
    if (recipeIds.length === 0) {
      return res.status(200).json(ApiResponse.success({ recipes: [] }));
    }
    
    // Get recipe details
    const { data: recipes, error: recipeError } = await supabase
      .from('recipes')
      .select('id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,cook_time_minutes,prep_time_minutes,calories_per_serving,protein_g,carbs_g,fat_g,primary_protein,protein,dish_type,diet,description,is_public,created_at')
      .in('id', recipeIds)
      .eq('is_public', true);
    
    if (recipeError) {
      console.error('[FavoriteRecipes] GET recipes error:', recipeError);
      return res.status(500).json(ApiResponse.error(recipeError.message));
    }
    
    console.log('[FavoriteRecipes] Recipes found:', (recipes || []).length);
    return res.status(200).json(ApiResponse.success({ recipes: recipes || [] }));
  }

  return res.status(405).json(ApiResponse.methodNotAllowed());
}
