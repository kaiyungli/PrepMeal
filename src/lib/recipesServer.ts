// Server-side recipe fetching utilities
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Fetch recipes for server-side props
 * Only fetches fields that actually exist in the recipes table
 */
export async function fetchRecipesForServer(limit = 24) {
  const _fetchStart = Date.now();
  console.log('[home-ssr] fetchRecipesForServer_start');

  if (!supabaseServer) {
    console.error('[SSR] ERROR: Supabase server client NOT configured');
    return [];
  }

  try {
    // Only select fields that exist in recipes table (including slug for navigation)
    const { data, error, status } = await supabaseServer
      .from('recipes')
      .select(`
        id,
        slug,
        name,
        image_url,
        prep_time_minutes,
        cook_time_minutes,
        total_time_minutes,
        calories_per_serving,
        protein_g,
        difficulty,
        cuisine,
        primary_protein,
        dish_type,
        budget_level,
        is_complete_meal,
        method,
        created_at
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    const queryMs = Date.now() - _fetchStart;
    console.log('[home-ssr] fetchRecipesForServer_done', { duration_ms: queryMs, count: data?.length || 0 });

    if (error) {
      console.error('[SSR] ERROR: Supabase query failed:', JSON.stringify(error));
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data;

  } catch (err) {
    console.error('[SSR] FATAL EXCEPTION:', String(err));
    return [];
  }
}
