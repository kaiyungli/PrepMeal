/**
 * Recipe identity contract for the Generate complete catalogue.
 *
 * Shared by the /api/recipes?view=generate handler and the client verifier so
 * both sides accept and de-duplicate IDs identically.
 *
 * - A usable ID is a non-empty string or a finite number.
 * - Identity is `String(id)`: the number 1 and the string "1" are the SAME
 *   recipe, so a catalogue containing both is a duplicate, not two recipes.
 */
export type RecipeId = string | number;

export function isUsableRecipeId(id: unknown): id is RecipeId {
  return (typeof id === 'string' && id.length > 0) || (typeof id === 'number' && Number.isFinite(id));
}

export function recipeIdentityKey(id: RecipeId): string {
  return String(id);
}

export type CatalogueIdProblem = 'missing_id' | 'duplicate_id';

/** Returns the first identity problem in `recipes`, or null if all IDs are usable and unique. */
export function findCatalogueIdProblem(recipes: readonly unknown[]): CatalogueIdProblem | null {
  const seen = new Set<string>();
  for (const recipe of recipes) {
    const id = (recipe as { id?: unknown } | null)?.id;
    if (!isUsableRecipeId(id)) return 'missing_id';
    const key = recipeIdentityKey(id);
    if (seen.has(key)) return 'duplicate_id';
    seen.add(key);
  }
  return null;
}
