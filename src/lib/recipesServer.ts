// Server-side recipe fetching utilities
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Fetch recipes for server-side props
 * Queries Supabase directly - handles bad data gracefully
 */
export async function fetchRecipesForServer(limit = 24) {
  console.log('[SSR] fetchRecipesForServer: starting...');

  if (!supabaseServer) {
    console.error('[SSR] ERROR: Supabase server client NOT configured');
    console.error('[SSR] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'NOT set');
    console.error('[SSR] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'NOT set');
    return [];
  }

  console.log('[SSR] Supabase client configured, querying recipes...');

  try {
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
        ingredients,
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

    console.log('[SSR] Query successful, count:', data?.length || 0);

    // Validate and parse each recipe's ingredients
    if (!data || data.length === 0) {
      return [];
    }

    const safeRecipes = [];
    for (const recipe of data) {
      try {
        let parsedIngredients = [];
        
        // Safe parse ingredients
        if (recipe.ingredients) {
          try {
            parsedIngredients = typeof recipe.ingredients === 'string'
              ? JSON.parse(recipe.ingredients)
              : recipe.ingredients;
            
            if (!Array.isArray(parsedIngredients)) {
              console.warn('[SSR] WARN: ingredients not array for recipe', recipe.id, typeof parsedIngredients);
              parsedIngredients = [];
            }
          } catch (parseErr) {
            console.warn('[SSR] WARN: Invalid JSON in ingredients for recipe', recipe.id, String(parseErr));
            parsedIngredients = [];
          }
        }

        safeRecipes.push({
          ...recipe,
          ingredients: parsedIngredients
        });
      } catch (rowErr) {
        console.error('[SSR] ERROR: Failed to process recipe', recipe?.id, String(rowErr));
        // Skip bad row, continue with others
      }
    }

    console.log('[SSR] Safe recipes count:', safeRecipes.length);
    return safeRecipes;

  } catch (err) {
    console.error('[SSR] FATAL EXCEPTION:', String(err));
    console.error('[SSR] Stack:', String(err));
    return [];
  }
}
