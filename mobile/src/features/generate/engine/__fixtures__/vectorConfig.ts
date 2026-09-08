/**
 * Shared `planWeekAdvanced` config reconstruction for parity vectors.
 *
 * A vector's config is stored as plain JSON (`__fixtures__/expected/vectors.json`)
 * so it cannot carry the `isWeekend` function or the `lockedRecipes` recipe
 * objects. Both the vector GENERATOR (run against the web engine) and
 * `mealPlanner.parity.test.ts` (run against the vendored engine) rebuild the
 * full config through this one helper, so the two sides can never diverge in how
 * they interpret a stored vector.
 */

/** Serialisable slice of `planWeekAdvanced`'s config. */
export interface VectorConfigSpec {
  daysPerWeek: number;
  dishesPerDay: number;
  slotRoles: string[];
  dailyComposition: string;
  allowCompleteMeal: boolean;
  cuisines: string[];
  exclusions: string[];
  cookingConstraints: string[];
  budget: string;
  pantryIngredients: string[];
  lockedSlots: Record<string, boolean>;
}

/** The fixed weekend rule used everywhere in this slice (Sat/Sun). */
export function isWeekendKey(dayKey: string): boolean {
  return dayKey === 'sat' || dayKey === 'sun';
}

/**
 * Rebuild the full runtime config from a stored spec.
 * `lockedRecipeRefs` maps a slot key -> index into `recipes`, so a locked-slot
 * vector references a concrete recipe object without embedding it twice.
 */
export function buildVectorConfig(
  spec: VectorConfigSpec,
  recipes: ReadonlyArray<Record<string, unknown>>,
  lockedRecipeRefs: Record<string, number> = {},
): VectorConfigSpec & {
  isWeekend: (dayKey: string) => boolean;
  lockedRecipes: Record<string, Record<string, unknown>>;
} {
  const lockedRecipes: Record<string, Record<string, unknown>> = {};
  for (const [slot, index] of Object.entries(lockedRecipeRefs)) {
    lockedRecipes[slot] = recipes[index] as Record<string, unknown>;
  }
  return { ...spec, isWeekend: isWeekendKey, lockedRecipes };
}
