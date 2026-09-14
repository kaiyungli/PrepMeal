// ===========================================================================
// adminRecipeExportShape
// ---------------------------------------------------------------------------
// Pure shape builders for the admin recipe import/export envelope:
//
//   { format: "prepmeal.recipe-export", version: 1, exported_at, recipes: [...] }
//
// PURE JAVASCRIPT. No Supabase / client / server / env / Next imports, so this
// module is safe to import from both export.js (building the payload from DB
// rows) and adminRecipeImportResolve.js (validating an uploaded payload
// against the same format/version/bound), and to unit test in isolation.
//
// FIELD NAMES ON PURPOSE MATCH THE BODY SHAPE `buildRecipeAtomicParams`
// (src/lib/adminRecipeAtomicParams.js) EXPECTS -- prep_time not
// prep_time_minutes, servings not base_servings -- so the round trip is
// export -> resolve references (ingredient_slug/unit_code -> id) ->
// buildRecipeAtomicParams() with zero remapping of metadata fields.
// ===========================================================================

export const EXPORT_FORMAT = 'prepmeal.recipe-export';
export const EXPORT_VERSION = 1;

// Shared bound for both directions of the contract: an import over this many
// recipes is rejected before any lookup/RPC work; an export whose exportable
// recipe count exceeds this errors instead of silently truncating.
export const MAX_RECIPES = 200;

// A portable reference (ingredient_slug / unit_code) is only usable on
// import if it is a concrete, non-blank string. `undefined`/`null` (a
// missing or unmatched join), a blank string, or a non-string value are all
// equally unusable -- normalized to `null` here so the caller can detect and
// reject them, never serialized as a real reference.
const normalizePortableRef = (value) => (typeof value === 'string' && value.trim() !== '' ? value : null);

// Build one export-shaped recipe object from a `recipes` row plus its child
// rows, as returned by Supabase embedded-resource selects:
//   recipe_ingredients row: { id, quantity, is_optional, prep_note, group_key,
//                             ingredients: { slug }, units: { code } }
//   recipe_steps row:       { id, step_no, text, time_seconds }
//
// Ingredients are sorted by their own row id (stable regardless of DB fetch
// order). Steps are sorted by step_no -- the authoritative order -- so export
// ordering is always deterministic even if the underlying query result order
// is not.
//
// THROWS if any ingredient row's joined `ingredients.slug` / `units.code` is
// missing, non-string, or blank. These portable references are mandatory for
// the file to be re-importable (`resolveRecipeParams` requires both as
// non-blank strings); serializing `null` here would produce an export that
// silently cannot be re-imported for that ingredient. The caller
// (export.js) runs this inside its top-level try/catch, so a thrown error
// fails the whole export (500) before any header or body is written -- never
// a partial envelope with a dropped/nulled reference.
export function buildRecipeExport(recipe, ingredientRows, stepRows) {
  const ingredients = (ingredientRows || [])
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((row) => {
      const ingredientSlug = normalizePortableRef(row.ingredients?.slug);
      if (!ingredientSlug) {
        throw new Error(
          `Recipe "${recipe?.slug ?? recipe?.name ?? '?'}": ingredient row ${row.id} has a missing, blank, or non-string ingredient slug reference. Refusing to export a non-portable reference.`,
        );
      }
      const unitCode = normalizePortableRef(row.units?.code);
      if (!unitCode) {
        throw new Error(
          `Recipe "${recipe?.slug ?? recipe?.name ?? '?'}": ingredient row ${row.id} has a missing, blank, or non-string unit code reference. Refusing to export a non-portable reference.`,
        );
      }
      return {
        ingredient_slug: ingredientSlug,
        unit_code: unitCode,
        quantity: row.quantity ?? null,
        is_optional: !!row.is_optional,
        notes: row.prep_note ?? null,
        group_key: row.group_key ?? null,
      };
    });

  const steps = (stepRows || [])
    .slice()
    .sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0))
    .map((row) => ({
      step_no: row.step_no,
      text: row.text,
      time_seconds: row.time_seconds ?? null,
    }));

  return {
    name: recipe.name,
    slug: recipe.slug,
    description: recipe.description ?? null,
    cuisine: recipe.cuisine,
    dish_type: recipe.dish_type,
    difficulty: recipe.difficulty,
    prep_time: recipe.prep_time_minutes ?? null,
    cook_time: recipe.cook_time_minutes ?? null,
    servings: recipe.base_servings,
    image_url: recipe.image_url ?? null,
    calories_per_serving: recipe.calories_per_serving ?? null,
    is_public: !!recipe.is_public,
    method: recipe.method,
    speed: recipe.speed,
    servings_unit: recipe.servings_unit ?? null,
    meal_role: recipe.meal_role ?? null,
    is_complete_meal: !!recipe.is_complete_meal,
    primary_protein: recipe.primary_protein ?? null,
    budget_level: recipe.budget_level ?? null,
    reuse_group: recipe.reuse_group ?? null,
    ingredients,
    steps,
  };
}

// Wrap already-built recipe objects in the versioned envelope. `exportedAt`
// is a caller-supplied ISO timestamp (not read from `Date.now()` here) so
// this stays a pure, deterministic function for tests.
export function buildExportEnvelope(recipes, exportedAt) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: exportedAt,
    recipes,
  };
}
