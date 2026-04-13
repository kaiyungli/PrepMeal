/**
 * Recipe Detail Normalizer
 * 
 * Single source for normalizing recipe detail data.
 * Transforms raw DB response to API response shape.
 */
import type { RecipeDetailRow, RecipeIngredient } from '../services/getRecipeDetail';

export interface NormalizedRecipe {
  id: string | number;
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
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string | { code: string; name: string } | null;
    category: string;
  }>;
  steps: string[];
  created_at: string;
}

/**
 * Normalize recipe detail from DB to API response shape
 * @param recipe - Raw recipe row
 * @returns Normalized recipe
 */
export function normalizeRecipeDetail(recipe: RecipeDetailRow): NormalizedRecipe {
  // Normalize ingredients - preserve real quantity and unit
  const normalizedIngredients: NormalizedRecipe['ingredients'] = (recipe.ingredients || []).map(
    (ing: RecipeIngredient) => ({
      id: ing.id || '',
      name: ing.name || '',
      quantity: ing.quantity || 1,
      unit: ing.unit || '',
      category: ing.shopping_category || 'other'
    })
  );

  // Normalize steps - convert to string array
  const normalizedSteps = (recipe.steps || []).map((step) => 
    step.text || ''
  ).filter(Boolean);

  return {
    id: recipe.id,
    name: recipe.name || '未知食譜',
    image_url: recipe.image_url || null,
    cuisine: recipe.cuisine || null,
    difficulty: recipe.difficulty || null,
    method: recipe.method || null,
    total_time_minutes: recipe.total_time_minutes || null,
    cook_time_minutes: recipe.cook_time_minutes || null,
    prep_time_minutes: recipe.prep_time_minutes || null,
    calories_per_serving: recipe.calories_per_serving || null,
    protein_g: recipe.protein_g || null,
    carbs_g: recipe.carbs_g || null,
    fat_g: recipe.fat_g || null,
    primary_protein: recipe.primary_protein || null,
    dish_type: recipe.dish_type || null,
    diet: recipe.diet || null,
    is_complete_meal: recipe.is_complete_meal || false,
    ingredients: normalizedIngredients,
    steps: normalizedSteps,
    created_at: recipe.created_at
  };
}
