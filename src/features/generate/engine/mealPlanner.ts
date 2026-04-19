/**
 * Meal Planner - Wrapper around core meal planning logic
 * 
 * This is a thin wrapper that calls the actual planner with proper configuration.
 * The core planning algorithm lives in @/lib/mealPlanner.
 */
import { planWeekAdvanced } from '@/lib/mealPlanner';

export interface MealPlannerConfig {
  daysPerWeek: number;
  dishesPerDay: number;
  slotRoles?: string[];
  dailyComposition: string;
  isWeekend: (dayKey: string) => boolean;
  cuisines: string[];
  exclusions: string[];
  cookingConstraints: string[];
  budget: string;
  allowCompleteMeal?: boolean;
  pantryIngredients: string[];
  lockedSlots: Record<string, boolean>;
  lockedRecipes: Record<string, any>;
  traceId?: string;
}

/**
 * Generate weekly meal plan using the planner engine
 * @param availableRecipes - Pool of recipes to choose from
 * @param config - Planner configuration
 * @returns Generated weekly plan
 */
export function generateWeeklyPlan(
  availableRecipes: any[],
  config: MealPlannerConfig
): Record<string, any[]> {
  return planWeekAdvanced(availableRecipes, config);
}
