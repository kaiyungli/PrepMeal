// Favorites API - GET, POST, DELETE
// Token-based auth (like /api/user/menus)

export default async function handler(req, res) {
  try {
    // Get user from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    
    console.log('[Favorites API] Method:', req.method);
    console.log('[Favorites API] Auth header:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Favorites API] No token - returning 401');
      return res.status(401).json({ error: 'Unauthorized - please log in' });
    }

    const token = authHeader.substring(7);
    console.log('[Favorites API] Token length:', token?.length);
    
    // Import here to avoid issues
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[Favorites API] supabaseUrl:', !!supabaseUrl);
    console.log('[Favorites API] supabaseAnonKey:', !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Favorites API] Missing env vars');
      return res.status(500).json({ error: 'Server not configured - missing env vars' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify token and get user
    console.log('[Favorites API] Calling getUser...');
    const userResult = await supabase.auth.getUser(token);
    const { data: { user }, error: authError } = userResult;
    
    console.log('[Favorites API] Auth error:', authError);
    console.log('[Favorites API] User:', user?.id);
    
    if (authError || !user) {
      console.log('[Favorites API] Invalid token - returning 401');
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    const userId = user.id;
    console.log('[Favorites API] UserId:', userId);

    if (req.method === 'GET') {
      console.log('[Favorites API] GET - querying user_favorites');
      const { data, error } = await supabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      console.log('[Favorites API] GET data:', data?.length, 'records');
      console.log('[Favorites API] GET error:', error);
      
      if (error) {
        console.error('[Favorites API] GET query error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      const favoriteIds = (data || []).map(f => f.recipe_id);
      return res.status(200).json({ favorites: favoriteIds });
    }

    if (req.method === 'POST') {
      const { recipe_id } = req.body;
      
      if (!recipe_id) {
        return res.status(400).json({ error: 'recipe_id required' });
      }
      
      console.log('[Favorites API] POST - adding:', recipe_id);
      
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: userId, recipe_id });
      
      console.log('[Favorites API] POST error:', error);
      
      if (error) {
        console.error('[Favorites API] POST insert error:', error);
        if (error.code === '23505') {
          return res.status(200).json({ success: true, message: 'Already favorited' });
        }
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { recipe_id } = req.query;
      
      if (!recipe_id) {
        return res.status(400).json({ error: 'recipe_id required' });
      }
      
      console.log('[Favorites API] DELETE - removing:', recipe_id);
      
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipe_id);
      
      console.log('[Favorites API] DELETE error:', error);
      
      if (error) {
        console.error('[Favorites API] DELETE error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (err) {
    console.error('[Favorites API] FATAL ERROR:', err);
    console.error('[Favorites API] Stack:', err.stack);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
