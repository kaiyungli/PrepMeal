/**
 * Recipe Detail Service
 * 
 * Single source for fetching recipe detail from database.
 * This is the ONLY place allowed to fetch recipe with ingredients and steps.
 */
import { supabaseServer } from '@/lib/supabaseServer';
import { perfNow, perfLog } from '@/utils/perf';

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
  
  // Build base query - no is_public filter for authenticated users
  const baseQuery = supabase
    .from('recipes')
    .select('*');

  // Query by id or slug
  const recipeResult = isUuid
    ? await baseQuery.eq('id', recipeIdOrSlug).single()
    : await baseQuery.eq('slug', recipeIdOrSlug).single();

  const { data: recipe, error: recipeError } = recipeResult;
  
  if (recipeError) {
    throw new Error('Recipe fetch failed: ' + recipeError.message);
  }
  
  if (!recipe) {
    throw new Error('Recipe not found');
  }

  // CRITICAL: Use recipe.id from the fetched row, NOT the original route param
  const resolvedRecipeId = recipe.id;

  // Fetch related data in parallel using resolvedRecipeId
  const [ingredientsResult, stepsResult] = await Promise.all([
    supabase.from('recipe_ingredients').select('quantity, unit_id, ingredients(id, name, slug, shopping_category)').eq('recipe_id', resolvedRecipeId),
    supabase.from('recipe_steps').select('step_no, text, time_seconds').eq('recipe_id', resolvedRecipeId).order('step_no')
  ]);

  const ingredientCount = (ingredientsResult?.data || []).length;
  const stepCount = (stepsResult?.data || []).length;
  
  const baseEnd = perfNow();
  perfLog({
    traceId: null,
    event: 'recipe_detail_db',
    stage: 'base_queries',
    label: 'recipe_detail.db.base_queries',
    start: fnStart,
    end: baseEnd,
    meta: { recipeId: resolvedRecipeId, ingredientCount, stepCount }
  });

  // Fetch all units for mapping
  const unitIds = [...new Set((ingredientsResult?.data || []).map((ri: any) => ri.unit_id).filter(Boolean))];
  const unitQueryStart = perfNow();
  let unitsMap = new Map();
  
  if (unitIds.length > 0) {
    const { data: units } = await supabase.from('units').select('id, code, name').in('id', unitIds);
    unitsMap = new Map((units || []).map(u => [u.id, { code: u.code, name: u.name }]));
  }
  
  const unitCount = unitsMap.size;
  
  const unitQueryEnd = perfNow();
  perfLog({
    traceId: null,
    event: 'recipe_detail_db',
    stage: 'units_query',
    label: 'recipe_detail.db.units',
    start: unitQueryStart,
    end: unitQueryEnd,
    meta: { recipeId: resolvedRecipeId, unitCount: unitCount || 0 }
  });

  // Transform ingredients with quantity and unit
  const ingredients = (ingredientsResult?.data || []).map((ri: any) => {
    const unit = unitsMap.get(ri.unit_id);
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

  const fnEnd = perfNow();
  perfLog({
    traceId: null,
    event: 'recipe_detail_db',
    stage: 'service_total',
    label: 'recipe_detail.db.service_total',
    start: fnStart,
    end: fnEnd,
    meta: { recipeId: resolvedRecipeId, ingredientCount, stepCount, unitCount }
  });

  return {
    ...recipe,
    ingredients,
    steps
  };
}
