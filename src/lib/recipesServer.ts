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
 */
export async function fetchRecipesForServer(limit = 24) {
  if (!supabaseServer) return [];

  try {
    const { data, error } = await supabaseServer
      .from('recipes')
      .select(CARD_FIELDS)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Fetch recipes for server-side props with total count
 */
export async function fetchRecipesForServerWithTotal(limit = 24) {
  if (!supabaseServer) return { recipes: [], total: 0 };

  try {
    const { data, error, count } = await supabaseServer
      .from('recipes')
      .select(CARD_FIELDS, { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error) return { recipes: [], total: 0 };
    return {
      recipes: data || [],
      total: count ?? 0
    };
  } catch (err) {
    return { recipes: [], total: 0 };
  }
}