// Get favorite recipes
import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  // Get user from session
  const { data: { user }, error: authError } = await supabase?.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get favorite recipe IDs
  const { data: favorites, error } = await supabase
    .from('user_favorites')
    .select('recipe_id')
    .eq('user_id', user.id);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  const recipeIds = favorites.map(f => f.recipe_id);
  
  if (recipeIds.length === 0) {
    return res.status(200).json({ recipes: [] });
  }
  
  // Get recipe details
  const { data: recipes, error: recipeError } = await supabase
    .from('recipes')
    .select('id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,cook_time_minutes,prep_time_minutes,calories_per_serving,protein_g,carbs_g,fat_g,primary_protein,protein,dish_type,diet,description,is_public,created_at')
    .in('id', recipeIds)
    .eq('is_public', true);
  
  if (recipeError) {
    return res.status(500).json({ error: recipeError.message });
  }
  
  return res.status(200).json({ recipes: recipes || [] });
}
