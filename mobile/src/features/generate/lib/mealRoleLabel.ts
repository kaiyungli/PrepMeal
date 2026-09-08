/**
 * Meal-role badge label for a generated recipe row.
 *
 * Ported verbatim (logic) from the web `WeeklyPlanGrid.getMealRoleLabel`
 * (`src/components/generate/WeeklyPlanGrid.tsx`), so the preview labels a slot
 * the same way the web plan grid does.
 */
import type { GenerateRecipe } from '../types.ts';

export function mealRoleLabel(
  recipe: Pick<GenerateRecipe, 'is_complete_meal' | 'meal_role' | 'dish_type'>,
): string | null {
  if (recipe.is_complete_meal || recipe.meal_role === 'complete_meal') return '完整餐';
  if (recipe.meal_role === 'veg_side') return '配菜';
  if (recipe.meal_role === 'protein_main') return '主菜';
  if (recipe.dish_type === 'side') return '配菜';
  if (recipe.dish_type === 'soup') return '湯';
  return null;
}
