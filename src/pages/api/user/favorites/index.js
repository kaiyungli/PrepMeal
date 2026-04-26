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
      
      // Branch BEFORE querying - single query only
      if (req.query.include === 'recipes') {
        const joinStart = Date.now();
        
        const { data: joinData, error: joinError } = await serverSupabase
          .from('user_favorites')
          .select(`
            recipe_id,
            recipes (
              id,
              slug,
              name,
              image_url,
              prep_time_minutes,
              cook_time_minutes,
              total_time_minutes,
              calories_per_serving,
              protein_g,
              carbs_g,
              fat_g,
              difficulty,
              cuisine,
              method,
              dish_type,
              primary_protein,
              budget_level,
              is_complete_meal,
              speed,
              created_at
            )
          `)
          .eq('user_id', userId);
        
        console.log('[favorites-api] get_with_recipes_join_done', {
          duration_ms: Date.now() - joinStart,
          favoriteCount: (joinData || []).length,
          recipeCount: (joinData || []).filter(r => r.recipes).length
        });
        
        if (joinError) {
          console.error('[favorites-api] join_error', {
            message: joinError.message,
            details: joinError
          });
          return res.status(500).json(ApiResponse.error(joinError.message));
        }
        
        const favorites = (joinData || []).map(row => String(row.recipe_id));
        const recipes = (joinData || [])
          .map(row => row.recipes)
          .filter(Boolean);
        
        return res.status(200).json(ApiResponse.success({
          favorites,
          recipes
        }));
      }
      
      // Default ID-only behavior
      const { data: favData, error: favError } = await serverSupabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      console.log('[favorites-api] get_query_done', {
        duration_ms: Date.now() - start,
        count: (favData || []).length
      });
      
      if (favError) {
        return res.status(500).json(ApiResponse.error(favError.message));
      }
      
      const favorites = (favData || []).map(f => String(f.recipe_id));
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