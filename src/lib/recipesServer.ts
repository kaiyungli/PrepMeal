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

// The home catalogue is regenerated with the page every five minutes. Fetching
// the filter fields once avoids a network round trip on every filter click.
const HOME_FIELDS = `${CARD_FIELDS.trim()}, description, speed, diet, flavor, times_shown, base_servings`;
const HOME_CATALOG_LIMIT = 1000;

export async function fetchHomeRecipeCatalog() {
  if (!supabaseServer) return null;
  try {
    const { data, error, count } = await supabaseServer
      .from('recipes')
      .select(HOME_FIELDS, { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(HOME_CATALOG_LIMIT);
    // Never filter a truncated catalogue: fall back to the paginated API.
    if (error || !data || count == null || data.length !== count) return null;
    return data;
  } catch {
    return null;
  }
}

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
  } catch {
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
  } catch {
    return { recipes: [], total: 0 };
  }
}

const LINK_FIELDS = 'slug, name, meal_role, is_complete_meal, primary_protein, cuisine';
const LINK_PAGE_SIZE = 1000;

/**
 * Light list of every public recipe for crawlable internal links (recipe index
 * on /recipes, related recipes on detail pages). Returns null on any error so
 * callers render without links rather than a partial list.
 */
export async function fetchRecipeLinkCatalog() {
  if (!supabaseServer) return null;
  try {
    const rows = [];
    let total: number | null = null;
    for (let from = 0; ; from += LINK_PAGE_SIZE) {
      const { data, error, count } = await supabaseServer
        .from('recipes')
        .select(LINK_FIELDS, { count: 'exact' })
        .eq('is_public', true)
        .not('slug', 'is', null)
        .order('slug', { ascending: true })
        .range(from, from + LINK_PAGE_SIZE - 1);
      if (error || !data || count == null) return null;
      if (total !== null && count !== total) return null;
      total = count;
      rows.push(...data);
      if (rows.length === total) break;
      // A lower API row limit must not turn an incomplete list into the full index.
      if (data.length < LINK_PAGE_SIZE || rows.length > total) return null;
    }
    return rows;
  } catch {
    return null;
  }
}
