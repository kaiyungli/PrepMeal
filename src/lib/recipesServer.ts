// Server-side recipe fetching utilities
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Fetch recipes for server-side props
 * Queries Supabase directly instead of self-fetching API route
 */
export async function fetchRecipesForServer(limit = 24) {
  // Diagnostic: Check if supabaseServer is configured
  if (!supabaseServer) {
    console.error('[SSR] Supabase server client NOT configured');
    console.error('[SSR] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'NOT set');
    console.error('[SSR] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'NOT set');
    return [];
  }

  console.log('[SSR] Supabase server client configured, fetching recipes...');

  try {
    const { data, error } = await supabaseServer
      .from('recipes')
      .select(`
        id,
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

    if (error) {
      console.error('[SSR] Error fetching recipes:', error);
      return [];
    }

    console.log('[SSR] Fetched recipes count:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.error('[SSR] Exception fetching recipes:', err);
    return [];
  }
}