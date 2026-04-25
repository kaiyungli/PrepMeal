/**
 * Recipe Detail Service
 *
 * Single source for fetching recipe detail from database.
 * This is the ONLY place allowed to fetch recipe with ingredients and steps.
 */
import { supabaseServer } from '@/lib/supabaseServer';

// Server-side timing helper
const perfNow = () => Date.now();

export interface RecipeIngredient {
  id: string;
  name: string;
  slug: string;
  shopping_category: string | null;
  quantity: number;
  unit: { code: string; name: string } | null;
}

export interface RecipeStep {
  step_no: number;
  text: string;
  time_seconds: number | null;
}

export interface RecipeDetailRow {
  id: string;
  name: string;
  image_url: string | null;
  cuisine: string | null;
  difficulty: string | null;
  method: string | null;
  total_time_minutes: number | null;
  cook_time_minutes: number | null;
  prep_time_minutes: number | null;
  calories_per_serving: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  primary_protein: string | null;
  dish_type: string | null;
  diet: string[] | null;
  is_complete_meal: boolean;
  created_at: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

/**
 * Load recipe detail with ingredients and steps
 * @param recipeIdOrSlug - Recipe ID or slug
 * @returns Recipe detail row
 */
export async function getRecipeDetail(recipeIdOrSlug: string): Promise<RecipeDetailRow> {
  const fnStart = perfNow();
  const supabase = supabaseServer;

  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  // Detect UUID vs slug - UUIDs follow specific pattern
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipeIdOrSlug);

  // Build base query - optimized select (only needed fields)
  const baseQuery = supabase
    .from('recipes')
    .select(`
      id,
      name,
      image_url,
      description,
      difficulty,
      method,
      speed,
      calories_per_serving,
      protein_g,
      carbs_g,
      fat_g,
      total_time_minutes,
      cook_time_minutes,
      prep_time_minutes,
      cuisine,
      primary_protein,
      dish_type,
      diet,
      is_complete_meal,
      created_at
    `);

  // Query by id or slug
  const recipeQueryStart = perfNow();
  const recipeResult = isUuid
    ? await baseQuery.eq('id', recipeIdOrSlug).single()
    : await baseQuery.eq('slug', recipeIdOrSlug).single();
  const recipeQueryMs = perfNow() - recipeQueryStart;

  const { data: recipe, error: recipeError } = recipeResult;

  if (recipeError) {
    console.error('[recipe-detail] recipe_query_failed', { id_or_slug: recipeIdOrSlug, error: recipeError.message });
    throw new Error('Recipe fetch failed: ' + recipeError.message);
  }

  if (!recipe) {
    throw new Error('Recipe not found');
  }

  // CRITICAL: Use recipe.id from the fetched row, NOT the original route param
  const resolvedRecipeId = recipe.id;
  console.log('[recipe-detail] recipe_query_done', {
    duration_ms: Math.round(recipeQueryMs * 100) / 100,
    id_or_slug: recipeIdOrSlug,
    resolved_id: resolvedRecipeId
  });

  // Fetch related data in parallel using resolvedRecipeId
  const ingredientsQueryStart = perfNow();
  const stepsQueryStart = perfNow();
  
  const ingredientsResultPromise = supabase
    .from('recipe_ingredients')
    .select(`
      quantity,
      unit:units(id, code, name),
      ingredients(id, name, slug, shopping_category)
    `)
    .eq('recipe_id', resolvedRecipeId);

  const stepsResultPromise = supabase
    .from('recipe_steps')
    .select('step_no, text, time_seconds')
    .eq('recipe_id', resolvedRecipeId)
    .order('step_no');

  const [ingredientsResult, stepsResult] = await Promise.all([
    ingredientsResultPromise,
    stepsResultPromise
  ]);

  if (ingredientsResult.error) {
    console.error('[recipe-detail] ingredients_query_failed', { resolved_id: resolvedRecipeId, error: ingredientsResult.error.message });
  }
  if (stepsResult.error) {
    console.error('[recipe-detail] steps_query_failed', { resolved_id: resolvedRecipeId, error: stepsResult.error.message });
  }

  const ingredientCount = (ingredientsResult?.data || []).length;
  const stepCount = (stepsResult?.data || []).length;

  console.log('[recipe-detail] ingredients_query_done', {
    duration_ms: Math.round((perfNow() - ingredientsQueryStart) * 100) / 100,
    resolved_id: resolvedRecipeId,
    ingredient_count: ingredientCount
  });
  
  console.log('[recipe-detail] steps_query_done', {
    duration_ms: Math.round((perfNow() - stepsQueryStart) * 100) / 100,
    resolved_id: resolvedRecipeId,
    step_count: stepCount
  });
  
  console.log('[recipe-detail] related_queries_done', { 
    resolved_id: resolvedRecipeId, 
    ingredient_count: ingredientCount, 
    step_count: stepCount 
  });
  
  // Transform ingredients with joined unit (no separate query needed)
  const ingredients = (ingredientsResult?.data || []).map((ri: any) => {
    const unit = ri.unit;
    return {
      id: ri.ingredients?.id || '',
      name: ri.ingredients?.name || '',
      slug: ri.ingredients?.slug || '',
      shopping_category: ri.ingredients?.shopping_category || null,
      quantity: ri.quantity || 1,
      unit: unit ? { code: unit.code, name: unit.name } : null
    };
  });

  const steps = (stepsResult?.data || []).map((s: any) => ({
    step_no: s.step_no,
    text: s.text,
    time_seconds: s.time_seconds
  }));

  const totalMs = Math.round((Date.now() - fnStart) * 100) / 100;
  console.log('[recipe-detail] service_total', {
    duration_ms: totalMs,
    resolved_id: resolvedRecipeId,
    ingredient_count: ingredientCount,
    step_count: stepCount
  });

  return {
    ...recipe,
    ingredients,
    steps
  };
}
