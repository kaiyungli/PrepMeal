// Favorites API - GET, POST, DELETE
import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  // Get user from session
  const { data: { user }, error: authError } = await supabase?.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;

  if (req.method === 'GET') {
    // Get user's favorites
    const { data, error } = await supabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', userId);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    const favoriteIds = data.map(f => f.recipe_id);
    return res.status(200).json({ favorites: favoriteIds });
  }

  if (req.method === 'POST') {
    // Add favorite
    const { recipe_id } = req.body;
    
    if (!recipe_id) {
      return res.status(400).json({ error: 'recipe_id required' });
    }
    
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: userId, recipe_id });
    
    if (error) {
      // Ignore duplicate errors
      if (error.code === '23505') {
        return res.status(200).json({ success: true, message: 'Already favorited' });
      }
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    // Remove favorite
    const { recipe_id } = req.query;
    
    if (!recipe_id) {
      return res.status(400).json({ error: 'recipe_id required' });
    }
    
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipe_id);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
