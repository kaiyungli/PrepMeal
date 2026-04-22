/**
 * Nutrition Tagging Rules
 * 
 * Single source of truth for nutrition-based tagging rules.
 * All code paths should use these constants and helpers.
 */

// High Protein Rule Constants
export const HIGH_PROTEIN_RULE = {
  MIN_PROTEIN_G: 25,
  MIN_PROTEIN_RATIO: 0.20, // (protein_g * 4) / calories >= 0.20
  VALID_DISH_TYPES: ['main'],
} as const;

export interface NutritionRuleInput {
  protein_g: number | string | null;
  calories_per_serving: number | string | null;
  dish_type: string | null;
  is_complete_meal: boolean | null;
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
  // Convert to number safely
  const protein = Number(recipe.protein_g);
  const calories = Number(recipe.calories_per_serving);
  
  // Edge cases - use Number.isFinite for safety
  if (!Number.isFinite(protein) || protein <= 0) return false;
  if (!Number.isFinite(calories) || calories <= 0) return false;
  
  // Check minimum protein
  if (protein < HIGH_PROTEIN_RULE.MIN_PROTEIN_G) return false;
  
  // Check protein ratio: (protein * 4) / calories >= 0.20
  const ratio = (protein * 4) / calories;
  if (ratio < HIGH_PROTEIN_RULE.MIN_PROTEIN_RATIO) return false;
  
  // Check valid dish type or complete meal
  const dishType = (recipe.dish_type ?? '').toLowerCase().trim();
  const isCompleteMeal = recipe.is_complete_meal === true;
  
  if (dishType !== 'main' && !isCompleteMeal) return false;
  
  return true;
}

/**
 * Get high_protein diet tag value
 */
export function getHighProteinTag(): string {
  return 'high_protein';
}
