/**
 * Minimal meal-plan shape for "my plans" list rendering in upcoming slices.
 *
 * Loosely mirrors the web app's saved menu rows (`menus.menu_data`, see
 * `src/services/menuPlans.ts` and `src/lib/menuPlanSummary.ts` on web). Only the
 * fields a list view needs are modelled here; the full day-by-day plan
 * structure and planner scoring are out of scope for this slice.
 */
import type { RecipeId } from './recipe';

export type MealPlanId = string | number;

export interface MealPlanPreviewItem {
  recipeId: RecipeId | null;
  recipeName: string;
  mealSlot: string;
}

export interface MealPlanSummary {
  id: MealPlanId;
  name: string;
  createdAt: string | null;
  daysPerWeek: number;
  dishesPerDay: number;
  itemCount: number;
  previewItems: MealPlanPreviewItem[];
}
