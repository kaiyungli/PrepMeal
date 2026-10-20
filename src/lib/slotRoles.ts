/**
 * Slot role rules - single source of truth for whether a recipe may fill a
 * planner slot. Slot roles themselves come from COMPOSITION_CONFIG.
 *
 * Used by the planner (generate, locked recipes, perfect pantry match) and by
 * the generate feature's replace and add-random actions.
 */
import { COMPOSITION_CONFIG } from '@/constants/composition';

export interface SlotRoleRecipe {
  meal_role?: string | null
  dish_type?: string | null
  is_complete_meal?: boolean | null
  primary_protein?: string | null
}

// Helper to check if a recipe matches a slot role with refined priority.
// An empty slot (null/undefined) matches no role.
export function matchesSlotRole(recipe: SlotRoleRecipe | null | undefined, slotRole: string): boolean {
  if (!recipe) return false;
  const mealRole = recipe.meal_role;
  const dishType = recipe.dish_type;
  const isCompleteMeal = recipe.is_complete_meal;
  const primaryProtein = recipe.primary_protein;

  // Role-specific matching with priority
  switch (slotRole) {
    case 'complete_meal':
      return mealRole === 'complete_meal' || isCompleteMeal === true;

    case 'protein_main':
      // An explicit catalogue role is authoritative. In particular,
      // protein_side and complete_meal are not interchangeable with main.
      if (mealRole) return mealRole === 'protein_main';
      // Legacy records with no meal_role retain limited inferred matching.
      if (dishType === 'soup' || dishType === 'side' || dishType === 'staple' || dishType === 'snack') return false;
      if (dishType === 'main') return true;
      return !!primaryProtein && primaryProtein !== 'vegetarian';

    case 'veg_side':
      if (mealRole) return mealRole === 'veg_side';
      // Only infer a role for legacy unclassified recipes.
      return dishType === 'side' && !primaryProtein;

    case 'soup':
      return mealRole === 'soup' || dishType === 'soup';

    // Explicit fallback roles
    case 'main':
      return dishType === 'main';
    case 'side':
      return dishType === 'side';
    case 'any':
      return true;
    default:
      return false;
  }
}

/**
 * Option 1: an explicitly enabled complete meal may replace a protein-main
 * slot in a mixed composition, while the veg-side slot stays mandatory.
 * Never promote protein_side, soup, or veg_side by their protein tag.
 */
export function matchesConfiguredSlotRole(
  recipe: SlotRoleRecipe | null | undefined,
  slotRole: string,
  composition: string,
  allowCompleteMeal?: boolean
): boolean {
  if (matchesSlotRole(recipe, slotRole)) return true;
  return slotRole === 'protein_main'
    && composition !== 'complete_meal'
    && allowCompleteMeal === true
    && recipe?.meal_role === 'complete_meal';
}

/**
 * A day holds at most one complete meal, in every composition (single-slot
 * complete_meal days meet it trivially). True when `recipe` may join a day
 * whose other slots hold `otherRecipesInDay`. allowCompleteMeal=false is the
 * separate, stricter fitsCompleteMealSetting.
 */
export function fitsDailyCompleteMealLimit(
  recipe: SlotRoleRecipe | null | undefined,
  otherRecipesInDay: Array<SlotRoleRecipe | null | undefined>
): boolean {
  return !matchesSlotRole(recipe, 'complete_meal')
    || !otherRecipesInDay.some(other => matchesSlotRole(other, 'complete_meal'));
}

/**
 * The allowCompleteMeal setting: with it off, a mixed composition (more than
 * one dish a day) never uses a complete meal, whatever its dish_type. The
 * complete_meal composition always needs them, so the setting does not apply
 * there. Unset counts as on.
 */
export function fitsCompleteMealSetting(
  recipe: SlotRoleRecipe | null | undefined,
  composition: string,
  allowCompleteMeal: boolean | undefined
): boolean {
  if (allowCompleteMeal !== false || !matchesSlotRole(recipe, 'complete_meal')) return true;
  const config = COMPOSITION_CONFIG[composition as keyof typeof COMPOSITION_CONFIG];
  return !config || config.dishesPerDay <= 1;
}

// Every role a composition mode assigns to its slots.
const COMPOSITION_SLOT_ROLES = new Set<string>(
  Object.values(COMPOSITION_CONFIG).flatMap(config => config.slotRoles)
);

/**
 * Whether a slot may fall back to recipes of another role when no recipe
 * matches its own role. Composition slots (complete_meal, protein_main,
 * veg_side) never do: they stay empty rather than silently holding an
 * ordinary main, a soup, a side or a protein dish in the wrong role. Only
 * legacy/untyped roles such as 'any' keep the cross-role fallback.
 */
export function allowsCrossRoleFallback(slotRole: string): boolean {
  return !COMPOSITION_SLOT_ROLES.has(slotRole);
}
