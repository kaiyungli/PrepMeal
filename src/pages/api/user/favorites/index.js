// Favorites API - GET, POST, DELETE
import { createClient } from '@supabase/supabase-js';
import { requireAuth, ApiResponse } from '../_auth';
import { createFavoritesServerTiming } from '@/lib/favoritesServerTiming';
import { favoritesRestFetch, measureFavoritesRest } from '@/lib/favoritesRestTiming';

// Service role client for server-side DB access (bypasses RLS)
const serverSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: { fetch: favoritesRestFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

function createUserClient(supabaseUrl, anonKey, token) {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

export default async function handler(req, res) {
  const timing = createFavoritesServerTiming(req, res);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json(ApiResponse.error('Missing Supabase config'));
  }
  let readPath = 'rest';
  
  try {
    const userId = await timing.measure('auth', () => requireAuth(req, res, timing));
    if (!userId) return;
    
    // GET: Use service role client (faster, bypasses RLS)
    if (req.method === 'GET') {
      // Full recipe reads use independently reversible deployment gates.
      // Absent/unknown environments stay on REST.
      const previewRpc = process.env.VERCEL_ENV === 'preview' &&
        process.env.FAVORITES_PREVIEW_RPC_ENABLED === '1' &&
        process.env.FAVORITES_RPC_COMPARISON_ENABLED === '1' && req.query.include === 'recipes';
      const productionRpc = process.env.VERCEL_ENV === 'production' &&
        process.env.FAVORITES_PRODUCTION_RPC_ENABLED === '1' &&
        process.env.FAVORITES_RPC_COMPARISON_ENABLED === '1' && req.query.include === 'recipes';
      readPath = req.query.read_path ?? (previewRpc || productionRpc ? 'rpc' : 'rest');
      if (req.query.read_path !== undefined &&
          (!timing.enabled || req.query.include !== 'recipes' || !['rest', 'rpc'].includes(readPath))) {
        return res.status(400).json(ApiResponse.badRequest('Invalid diagnostic read path'));
      }
      if (readPath === 'rpc' && process.env.FAVORITES_RPC_COMPARISON_ENABLED !== '1') {
        return res.status(503).json(ApiResponse.error('RPC comparison is not enabled'));
      }
      if (!serverSupabase) {
        return res.status(500).json(ApiResponse.error('Service role client not configured'));
      }
      
      // Branch BEFORE querying - single query only
      if (req.query.include === 'recipes') {
        const { data: joinData, error: joinError } = await timing.measure('db_request', () => measureFavoritesRest(timing, () => readPath === 'rpc'
          ? serverSupabase.rpc('get_favorites_recipes_comparison', { p_user_id: userId }, { get: true })
          : serverSupabase
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
              created_at,
              description,
              diet,
              flavor,
              times_shown
            )
          `)
          .eq('user_id', userId)));
        
        if (joinError) {
          if (readPath === 'rpc') {
            // No silent REST fallback: a failed experiment is not a valid RPC sample.
            return res.status(500).json(ApiResponse.error('RPC comparison read failed'));
          }
          console.error('[favorites-api] join_error', {
            message: joinError.message,
            details: joinError
          });
          return res.status(500).json(ApiResponse.error(joinError.message));
        }
        if (timing.enabled || previewRpc || productionRpc) {
          res.setHeader?.('X-PrepMeal-Favorites-Read-Path', readPath);
          res.setHeader?.('Cache-Control', 'private, no-store');
        }
        
        const result = timing.prepare(() => {
          const favorites = (joinData || []).map(row => String(row.recipe_id));
          const recipes = (joinData || [])
            .map(row => row.recipes)
            .filter(Boolean);
          return ApiResponse.success({ favorites, recipes });
        });
        
        return res.status(200).json(result);
      }
      
      // Default ID-only behavior
      const { data: favData, error: favError } = await timing.measure('db_request', () => measureFavoritesRest(timing, () => serverSupabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', userId)));
      
      if (favError) {
        return res.status(500).json(ApiResponse.error(favError.message));
      }
      
      const result = timing.prepare(() => ApiResponse.success({ favorites: (favData || []).map(f => String(f.recipe_id)) }));
      return res.status(200).json(result);
    }

    // POST: Use user client (needs user token for RLS)
    if (req.method === 'POST') {
      const { recipe_id } = req.body;
      
      if (!recipe_id) {
        return res.status(400).json(ApiResponse.badRequest('recipe_id required'));
      }

      // GET needs only the shared reader. Create a token-scoped writer only
      // after a valid mutation; never share its Authorization across requests.
      const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, req.headers.authorization?.substring(7));
      
      const { error } = await timing.measure('db_request', () => userSupabase
        .from('user_favorites')
        .insert({ user_id: userId, recipe_id }));
      
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

      const userSupabase = createUserClient(supabaseUrl, supabaseAnonKey, req.headers.authorization?.substring(7));
      
      const { data: deletedFavorites, error } = await timing.measure('db_request', () => userSupabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipe_id)
        .select('recipe_id'));
      
      if (error) {
        return res.status(500).json(ApiResponse.error(error.message));
      }

      if (!deletedFavorites?.length) {
        return res.status(404).json(ApiResponse.notFound('Favorite not found'));
      }
      
      return res.status(200).json(ApiResponse.success({ recipe_id }));
    }

    return res.status(405).json(ApiResponse.methodNotAllowed());
    
  } catch (err) {
    if (req.method === 'GET' && readPath === 'rpc') {
      return res.status(500).json(ApiResponse.error('RPC comparison read failed'));
    }
    return res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
  }
}
