/**
 * Recipe Detail Service
 * 
 * Single source for fetching recipe detail from database.
 * This is the ONLY place allowed to fetch recipe with ingredients and steps.
 */
import { supabase } from '@/lib/supabaseClient';
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
 * @param recipeId - Recipe ID
 * @returns Recipe detail row
 */
export async function getRecipeDetail(recipeId: string): Promise<RecipeDetailRow> {
  const fnStart = perfNow();
  
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  // Fetch recipe, ingredients, steps in parallel
  const [recipeResult, ingredientsResult, stepsResult] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', recipeId).single(),
    supabase
      .from('recipe_ingredients')
      .select('quantity, unit_id, ingredients(id, name, slug, shopping_category)')
      .eq('recipe_id', recipeId),
    supabase
      .from('recipe_steps')
      .select('step_no, text, time_seconds')
      .eq('recipe_id', recipeId)
      .order('step_no')
  ]);

  const { data: recipe } = recipeResult;
  if (!recipe) {
    throw new Error('Recipe not found');
  }

  const ingredientCount = (ingredientsResult.data || []).length;
  const stepCount = (stepsResult.data || []).length;
  
  // Log base queries
  const baseEnd = perfNow();
  perfLog({
    traceId: null,
    event: 'recipe_detail_db',
    stage: 'base_queries',
    label: 'recipe_detail.db.base_queries',
    start: fnStart,
    end: baseEnd,
    meta: { recipeId, ingredientCount, stepCount }
  });

  // Fetch all units for mapping
  const unitIds = [...new Set((ingredientsResult.data || []).map((ri: any) => ri.unit_id).filter(Boolean))];
  const unitQueryStart = perfNow();
  let unitsMap = new Map<string, { code: string; name: string }>();
  
  if (unitIds.length > 0) {
    const { data: units } = await supabase
      .from('units')
      .select('id, code, name')
      .in('id', unitIds);
    unitsMap = new Map((units || []).map(u => [u.id, { code: u.code, name: u.name }]));
  }
  
  const unitCount = unitsMap.size;
  
  // Log units query
  const unitQueryEnd = perfNow();
  perfLog({
    traceId: null,
    event: 'recipe_detail_db',
    stage: 'units_query',
    label: 'recipe_detail.db.units',
    start: unitQueryStart,
    end: unitQueryEnd,
    meta: { recipeId, unitCount: unitCount || 0 }
  });

  // Transform ingredients with quantity and unit
  const ingredients = (ingredientsResult.data || []).map((ri: any) => {
    const unit = unitsMap.get(ri.unit_id);
    return {
      id: ri.ingredients?.id || '',
      name: ri.ingredients?.name || '',
      slug: ri.ingredients?.slug || '',
      shopping_category: ri.ingredients?.shopping_category || null,
      quantity: ri.quantity || 1,
      unit: unit ? { code: unit?.code, name: unit?.name } : null
    };
  });

  // Transform steps
  const steps = (stepsResult.data || []).map((s: any) => ({
    step_no: s.step_no,
    text: s.text,
    time_seconds: s.time_seconds
  }));

  // Log service total
  const fnEnd = perfNow();
  perfLog({
    traceId: null,
    event: 'recipe_detail_db',
    stage: 'service_total',
    label: 'recipe_detail.db.service_total',
    start: fnStart,
    end: fnEnd,
    meta: { recipeId, ingredientCount, stepCount, unitCount }
  });

  return {
    ...recipe,
    ingredients,
    steps
  };
}
