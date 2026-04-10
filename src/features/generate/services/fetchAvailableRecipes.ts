/**
 * Fetch Available Recipes Service
 * 
 * Loads base recipe list from API for the generate page.
 */
import { perfNow, perfMeasure } from '@/utils/perf';

export interface Recipe {
  id: string | number;
  name: string;
  image_url: string | null;
  cuisine: string | null;
  difficulty: string | null;
  method: string | null;
  total_time_minutes: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  protein: string[];
  primary_protein: string | null;
  dish_type: string | null;
  diet: string[];
  is_complete_meal: boolean;
  // ... other fields
}

/**
 * Fetch available recipes for generation
 * @param limit - Max recipes to fetch
 * @returns Array of recipes
 */
export async function fetchAvailableRecipes(limit = 200): Promise<Recipe[]> {
  const t0 = perfNow();
  
  const res = await fetch(`/api/recipes?limit=${limit}&view=generate`);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch recipes: HTTP ${res.status}`);
  }
  
  const data = await res.json();
  perfMeasure('generate.recipesFetch', t0);
  
  return data.recipes || [];
}
