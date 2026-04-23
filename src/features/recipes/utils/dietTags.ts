/**
 * Diet Tag Derivation
 * 
 * Single source of truth for diet tag logic.
 * Uses shared helpers from:
 * - nutritionRules.ts (for nutrition-based tags: high_protein, low_fat, low_calorie)
 * - ingredientDietRules.ts (for ingredient-based tags: vegetarian, egg_lacto)
 */

import { isRecipeHighProtein, isRecipeLowFat, isRecipeLowCalorie } from '@/constants/nutritionRules';
import { isRecipeVegetarianByIngredients, isRecipeEggLactoByIngredients, deriveIngredientDietTags, type IngredientInput } from '@/constants/ingredientDietRules';

/**
 * Recipe interface for diet tag derivation
 * Includes both nutrition data and ingredient data
 */
interface DietTagRecipe {
  // Existing fields
  is_vegetarian?: boolean | null;
  diet?: string[] | null;
  calories_per_serving?: number | string | null;
  protein_g?: number | string | null;
  fat_g?: number | string | null;
  dish_type?: string | null;
  is_complete_meal?: boolean | null;
  // Ingredient data for vegetarian/egg_lacto derivation
  ingredients?: Array<{ name?: string | null; slug?: string | null }> | null;
}

/**
 * Derive diet tags from recipe data
 * Single source of truth for diet tag logic
 * 
 * Priority:
 * 1. Ingredient-derived tags (vegetarian, egg_lacto) - computed from ingredients
 * 2. Nutrition-derived tags (high_protein, low_fat, low_calorie) - computed from nutrition data
 * 3. DB-stored diet tags - merged in as fallback
 */
export function deriveDietTags(recipe: DietTagRecipe): string[] {
  const tags: string[] = [];
  
  if (!recipe) return tags;
  
  // === Ingredient-Based Tags (priority 1) ===
  // These are computed from actual ingredients, not from stored DB tags
  const ingredientTags = deriveIngredientDietTags({
    ingredients: (recipe.ingredients || []).map(ing => ({
      name: ing?.name ?? null,
      slug: ing?.slug ?? null,
    })) as IngredientInput[]
  });
  
  for (const tag of ingredientTags) {
    tags.push(tag);
  }
  
  // === Nutrition-Based Tags (priority 2) ===
  // Low calorie: use shared rule from nutritionRules.ts
  if (isRecipeLowCalorie({
    calories_per_serving: recipe.calories_per_serving ?? null,
    dish_type: recipe.dish_type ?? null,
    is_complete_meal: recipe.is_complete_meal ?? null,
  })) {
    tags.push('low_calorie');
  }
  
  // High protein: use shared rule from nutritionRules.ts
  if (isRecipeHighProtein({
    protein_g: recipe.protein_g ?? null,
    calories_per_serving: recipe.calories_per_serving ?? null,
    dish_type: recipe.dish_type ?? null,
    is_complete_meal: recipe.is_complete_meal ?? null,
  })) {
    tags.push('high_protein');
  }
  
  // Low fat: use shared rule from nutritionRules.ts
  if (isRecipeLowFat({
    fat_g: recipe.fat_g ?? null,
    calories_per_serving: recipe.calories_per_serving ?? null,
    dish_type: recipe.dish_type ?? null,
    is_complete_meal: recipe.is_complete_meal ?? null,
  })) {
    tags.push('low_fat');
  }
  
  // === DB-Stored Tags (priority 3 - fallback) ===
  // Add any other diet tags from DB that aren't derived
  if (recipe.diet && Array.isArray(recipe.diet)) {
    for (const d of recipe.diet) {
      // Skip tags we already derived from ingredients (they are the source of truth)
      if (d && !tags.includes(d) && d !== 'vegetarian' && d !== 'egg_lacto') {
        tags.push(d);
      }
    }
  }
  
  return [...new Set(tags)];
}
