// Server-side recipe fetching utilities
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Fetch recipes for server-side props
 * Queries Supabase directly instead of self-fetching API route
 */
export async function fetchRecipesForServer(limit = 24) {
  if (!supabaseServer) {
    console.error('Supabase server client not configured');
    return [];
  }

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
        created_at,
        ingredients
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recipes:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching recipes:', err);
    return [];
  }
}