/**
 * Shared slot-role filtering for generate feature layer
 * 
 * This is LOCAL logic for replace/add-random - NOT planner core.
 * Uses COMPOSITION_CONFIG for role mapping.
 */
import { COMPOSITION_CONFIG } from '@/constants/composition';

/**
 * Get slot roles array for a composition mode
 */
export function getSlotRolesForComposition(composition: string): string[] {
  const config = COMPOSITION_CONFIG[composition as keyof typeof COMPOSITION_CONFIG];
  return config?.slotRoles || ['any'];
}

/**
 * Determine slot role by index
 */
export function getSlotRoleForIndex(composition: string, index: number): string {
  const roles = getSlotRolesForComposition(composition);
  return roles[index % roles.length] || 'any';
}

/**
 * Check if recipe matches local slot role (safe version)
 */
export function matchesLocalSlotRole(recipe: any, slotRole: string): boolean {
  const mealRole = recipe.meal_role;
  const dishType = recipe.dish_type;
  const isCompleteMeal = recipe.is_complete_meal;
  const primaryProtein = recipe.primary_protein;

  if (slotRole === 'complete_meal') {
    return mealRole === 'complete_meal' || isCompleteMeal === true;
  }

  if (slotRole === 'protein_main') {
    return mealRole === 'protein_main' || dishType === 'main' || !!primaryProtein;
  }

  if (slotRole === 'veg_side') {
    return mealRole === 'veg_side' || (dishType === 'side' && !primaryProtein);
  }

  return true;
}
