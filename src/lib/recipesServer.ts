// Server-side recipe fetching utilities
import { supabaseServer } from '@/lib/supabaseServer';

// Fields for recipe cards
const CARD_FIELDS = `
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
`;

/**
 * Fetch recipes for server-side props
 * Only fetches fields needed for homepage cards
 */
export async function fetchRecipesForServer(limit = 24) {
  if (!supabaseServer) {
    console.error('[recipesServer] Supabase server client NOT configured');
    return [];
  }

  try {
    const { data, error } = await supabaseServer
      .from('recipes')
      .select(CARD_FIELDS)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[recipesServer] Supabase query failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data;

  } catch (err) {
    console.error('[recipesServer] FATAL EXCEPTION:', String(err));
    return [];
  }
}

/**
 * Fetch recipes for server-side props with total count
 * Used by /recipes page to show correct total on first load
 */
export async function fetchRecipesForServerWithTotal(limit = 24) {
  if (!supabaseServer) {
    console.error('[recipesServer] Supabase server client NOT configured');
    return { recipes: [], total: 0 };
  }

  try {
    const { data, error, count } = await supabaseServer
      .from('recipes')
      .select(CARD_FIELDS, { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[recipesServer] Supabase query failed:', error.message);
      return { recipes: [], total: 0 };
    }

    return {
      recipes: data || [],
      total: count ?? 0
    };

  } catch (err) {
    console.error('[recipesServer] FATAL EXCEPTION:', String(err));
    return { recipes: [], total: 0 };
  }
}