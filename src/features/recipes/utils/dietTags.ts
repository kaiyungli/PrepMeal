import type { Recipe } from '@/features/recipes';
import { isRecipeHighProtein } from '@/constants/nutritionRules';

/**
 * Derive diet tags from recipe nutritional data
 */
export function deriveDietTags(recipe: Recipe): string[] {
  const tags: string[] = [];
  
  if (!recipe) return tags;
  
  const protein = Number(recipe.protein_g);
  const cal = Number(recipe.calories_per_serving);
  const dishType = (recipe.dish_type ?? '').toLowerCase().trim();
  const isCompleteMeal = recipe.is_complete_meal === true;
  
  // Vegetarian check
  if (recipe.is_vegetarian || recipe.diet?.includes('vegetarian')) {
    tags.push('vegetarian');
  }
  
  // Low calorie: <= 400 kcal
  if (cal > 0 && cal <= 400) {
    tags.push('low_calorie');
  }
  
  // Low fat: <= 10g fat per serving
  const fat = Number(recipe.fat_g);
  if (!isNaN(fat) && fat > 0 && fat <= 10) {
    tags.push('low_fat');
  }
  
  // High protein: use shared rule from nutritionRules.ts
  if (isRecipeHighProtein({
    protein_g: protein,
    calories_per_serving: cal,
    dish_type: dishType,
    is_complete_meal: isCompleteMeal,
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