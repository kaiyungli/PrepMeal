// Server-side recipe fetching utilities
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Fetch recipes for server-side props
 * Only fetches fields that actually exist in the recipes table
 */
export async function fetchRecipesForServer(limit = 24) {

  if (!supabaseServer) {
    console.error('[SSR] ERROR: Supabase server client NOT configured');
    return [];
  }


  try {
    // Only select fields that exist in recipes table
    const { data, error, status } = await supabaseServer
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
      console.error('[SSR] ERROR: Supabase query failed:', JSON.stringify(error));
      console.error('[SSR] Error code:', error.code);
      console.error('[SSR] Error message:', error.message);
      console.error('[SSR] HTTP status:', status);
      return [];
    }


    if (!data || data.length === 0) {
      return [];
    }

    // Return recipes without ingredients - ingredients come from normalized tables
    return data.map(recipe => ({
      ...recipe,
      ingredients: [] // Empty - not from recipes table
    }));

  } catch (err) {
    console.error('[SSR] FATAL EXCEPTION:', String(err));
    return [];
  }
}
