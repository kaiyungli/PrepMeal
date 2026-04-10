/**
 * Recipe Detail Service
 * 
 * Single source for fetching recipe detail from database.
 * This is the ONLY place allowed to fetch recipe with ingredients and steps.
 */
import { supabase } from '@/lib/supabaseClient';

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
  primary_protein: string | null;
  dish_type: string | null;
  diet: string[] | null;
  is_complete_meal: boolean;
  created_at: string;
  ingredients: Array<{
    id: string;
    name: string;
    slug: string;
    shopping_category: string | null;
  }>;
  steps: Array<{
    step_no: number;
    text: string;
    time_seconds: number | null;
  }>;
}

/**
 * Load recipe detail with ingredients and steps
 * @param recipeId - Recipe ID
 * @returns Recipe detail row
 */
export async function getRecipeDetail(recipeId: string): Promise<RecipeDetailRow> {
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

  // Transform ingredients
  const ingredients = (ingredientsResult.data || []).map((ri: any) => ({
    id: ri.ingredients?.id || '',
    name: ri.ingredients?.name || '',
    slug: ri.ingredients?.slug || '',
    shopping_category: ri.ingredients?.shopping_category || null
  }));

  // Transform steps
  const steps = (stepsResult.data || []).map((s: any) => ({
    step_no: s.step_no,
    text: s.text,
    time_seconds: s.time_seconds
  }));

  return {
    ...recipe,
    ingredients,
    steps
  };
}
