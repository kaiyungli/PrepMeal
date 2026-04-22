import type { Recipe } from '@/features/recipes';
import { isRecipeHighProtein } from '@/constants/nutritionRules';

/**
 * Derive diet tags from recipe nutritional data
 * Single source of truth for diet tag logic
 */
export function deriveDietTags(recipe: Recipe): string[] {
  const tags: string[] = [];
  
  if (!recipe) return tags;
  
  // Vegetarian check
  if (recipe.is_vegetarian || recipe.diet?.includes('vegetarian')) {
    tags.push('vegetarian');
  }
  
  // Low calorie: <= 400 kcal per serving
  const calories = Number(recipe.calories_per_serving);
  if (calories > 0 && calories <= 400) {
    tags.push('low_calorie');
  }
  
  // Low fat: <= 10g fat per serving
  const fat = Number(recipe.fat_g);
  if (!isNaN(fat) && fat > 0 && fat <= 10) {
    tags.push('low_fat');
  }
  
  // High protein: use shared rule from nutritionRules.ts
  if (isRecipeHighProtein({
    protein_g: recipe.protein_g,
    calories_per_serving: recipe.calories_per_serving,
    dish_type: recipe.dish_type,
    is_complete_meal: recipe.is_complete_meal,
  })) {
    tags.push('high_protein');
  }
  
  // Add other diet tags from DB if present
  if (recipe.diet && Array.isArray(recipe.diet)) {
    for (const d of recipe.diet) {
      if (d && !tags.includes(d)) {
        tags.push(d);
      }
    }
  }
  
  return [...new Set(tags)];
}