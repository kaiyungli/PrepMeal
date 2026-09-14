// ===========================================================================
// recipeContract
// ---------------------------------------------------------------------------
// The single canonical copy of the eight admin-recipe metadata enums, taken
// verbatim from the live production CHECK constraints (see
// src/lib/adminRecipeAtomicParams.js for the full constraint provenance).
//
// PURE JAVASCRIPT. No Supabase / client / server / env / Next imports, so
// this module is safe to import from API routes, React components (client
// or server), and src/constants/taxonomy.ts alike.
//
// Admin UI (RecipeForm.js, admin/recipes/index.js), backend validation
// (adminRecipeAtomicParams.js), and display taxonomy (taxonomy.ts) all
// import these arrays rather than keeping their own copies, so the three
// layers cannot drift out of sync with the production contract again.
// ===========================================================================

export const CUISINES = Object.freeze(['chinese', 'western', 'japanese', 'korean', 'thai', 'fusion']);
export const DISH_TYPES = Object.freeze(['main', 'side', 'soup', 'staple', 'snack']);
export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);
export const METHODS = Object.freeze(['stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked']);
export const SPEEDS = Object.freeze(['quick', 'normal', 'slow']);
export const MEAL_ROLES = Object.freeze(['complete_meal', 'protein_main', 'veg_side', 'protein_side', 'soup']);
export const PRIMARY_PROTEINS = Object.freeze([
  'chicken', 'beef', 'pork', 'fish', 'seafood', 'shrimp', 'tofu', 'egg', 'vegetarian', 'mixed',
]);
export const BUDGET_LEVELS = Object.freeze(['budget', 'normal', 'premium']);
