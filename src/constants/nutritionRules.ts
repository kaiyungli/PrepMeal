/**
 * Nutrition Tagging Rules
 * 
 * Single source of truth for nutrition-based tagging rules.
 * All code paths should use these constants and helpers.
 */

// High Protein Rule Constants
export const HIGH_PROTEIN_RULE = {
  MIN_PROTEIN_G: 25,
  MIN_PROTEIN_RATIO: 0.20,
  VALID_DISH_TYPES: ['main'],
} as const;

// Low Fat Rule Constants
export const LOW_FAT_RULE = {
  MAX_FAT_G: 10,
  MAX_FAT_RATIO: 0.30,
  VALID_DISH_TYPES: ['main'],
} as const;

// Low Calorie Rule Constants
export const LOW_CALORIE_RULE = {
  MAX_CALORIES_MAIN: 400,
  MAX_CALORIES_SIDE: 300,
  VALID_DISH_TYPES_MAIN: ['main', 'staple'],
  VALID_DISH_TYPES_SIDE: ['side', 'soup', 'snack'],
} as const;

export interface NutritionRuleInput {
  protein_g?: number | string | null;
  calories_per_serving?: number | string | null;
  dish_type?: string | null;
  is_complete_meal?: boolean | null;
}

export interface NutritionRuleInputWithFat extends NutritionRuleInput {
  fat_g: number | string | null;
}

/**
 * Check if a recipe should be tagged as high_protein
 * 
 * Rules:
 * 1. protein_g >= 25
 * 2. (protein_g * 4) / calories >= 0.20
 * 3. dish_type = 'main' OR is_complete_meal = true
 */
export function isRecipeHighProtein(recipe: NutritionRuleInput): boolean {
  const protein = Number(recipe.protein_g);
  const calories = Number(recipe.calories_per_serving);
  
  if (!Number.isFinite(protein) || protein <= 0) return false;
  if (!Number.isFinite(calories) || calories <= 0) return false;
  
  if (protein < HIGH_PROTEIN_RULE.MIN_PROTEIN_G) return false;
  
  const ratio = (protein * 4) / calories;
  if (ratio < HIGH_PROTEIN_RULE.MIN_PROTEIN_RATIO) return false;
  
  const dishType = (recipe.dish_type ?? '').toLowerCase().trim();
  const isCompleteMeal = recipe.is_complete_meal === true;
  
  if (dishType !== 'main' && !isCompleteMeal) return false;
  
  return true;
}

/**
 * Check if a recipe should be tagged as low_fat
 * 
 * Rules:
 * 1. fat_g <= 10
 * 2. (fat_g * 9) / calories <= 0.30
 * 3. dish_type = 'main' OR is_complete_meal = true
 */
export function isRecipeLowFat(recipe: NutritionRuleInputWithFat): boolean {
  const fat = Number(recipe.fat_g);
  const calories = Number(recipe.calories_per_serving);
  
  if (!Number.isFinite(fat) || fat <= 0) return false;
  if (!Number.isFinite(calories) || calories <= 0) return false;
  
  if (fat > LOW_FAT_RULE.MAX_FAT_G) return false;
  
  const ratio = (fat * 9) / calories;
  if (ratio > LOW_FAT_RULE.MAX_FAT_RATIO) return false;
  
  const dishType = (recipe.dish_type ?? '').toLowerCase().trim();
  const isCompleteMeal = recipe.is_complete_meal === true;
  
  if (dishType !== 'main' && !isCompleteMeal) return false;
  
  return true;
}

/**
 * Check if a recipe should be tagged as low_calorie
 * 
 * Rules:
 * 1. calories_per_serving IS NOT NULL AND > 0
 * 2. For main/staple/complete meal: calories_per_serving <= 400
 * 3. For side/soup/snack: calories_per_serving <= 300
 */
export function isRecipeLowCalorie(recipe: NutritionRuleInput): boolean {
  const calories = Number(recipe.calories_per_serving);
  
  if (!Number.isFinite(calories) || calories <= 0) return false;
  
  const dishType = (recipe.dish_type ?? '').toLowerCase().trim();
  const isCompleteMeal = recipe.is_complete_meal === true;
  
  // Main/staple/complete meal: <= 400
  if (dishType === 'main' || dishType === 'staple' || isCompleteMeal) {
    return calories <= LOW_CALORIE_RULE.MAX_CALORIES_MAIN;
  }
  
  // Side/soup/snack: <= 300
  if (dishType === 'side' || dishType === 'soup' || dishType === 'snack') {
    return calories <= LOW_CALORIE_RULE.MAX_CALORIES_SIDE;
  }
  
  // Unknown dish type without is_complete_meal: don't tag as low_calorie
  return false;
}

/**
 * Get high_protein diet tag value
 */
export function getHighProteinTag(): string {
  return 'high_protein';
}

/**
 * Get low_fat diet tag value
 */
export function getLowFatTag(): string {
  return 'low_fat';
}

/**
 * Get low_calorie diet tag value
 */
export function getLowCalorieTag(): string {
  return 'low_calorie';
}