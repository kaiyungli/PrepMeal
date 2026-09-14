// ===========================================================================
// adminRecipeImportResolve
// ---------------------------------------------------------------------------
// Pure request-boundary validator + reference resolver + bounded-concurrency
// runner for the admin recipe bulk-import route (import.js).
//
// PURE JAVASCRIPT. No Supabase / client / server / env / Next imports, so
// this module is safe to unit test in isolation. The route (import.js) owns
// the two batched service-role lookups and the RPC calls; this module owns:
//
//   parseImportEnvelope   -- envelope shape / format / version / size bound
//   collectReferenceKeys  -- gather every ingredient_slug / unit_code used,
//                            so the route can resolve them with at most one
//                            batched query per reference table (an empty
//                            set skips that table's lookup entirely) before
//                            any RPC work
//   resolveRecipeParams   -- convert one recipe's ingredient_slug/unit_code
//                            references to ingredient_id/unit_id using the
//                            two lookup maps, and recompute step_no from
//                            array order (a client-supplied step_no is never
//                            trusted). The result is fed to
//                            buildRecipeAtomicParams() unchanged.
//   runBoundedConcurrent  -- a small fixed worker pool that processes N items
//                            with at most `concurrency` in flight at once,
//                            while preserving input order in the result array
//                            regardless of completion order.
//
// WHY BOUNDED CONCURRENCY
// ---------------------------------------------------------------------------
// A single import can carry up to MAX_RECIPES (200) recipes, each requiring
// its own admin_create_recipe_atomic RPC round trip (recipes are atomic
// individually; the batch itself is not — see import.js). Firing all 200 at
// once would open 200 simultaneous connections against the service-role
// Postgres role for no benefit, and this project has no vercel.json /
// per-route `maxDuration` override, so the deployed function timeout must be
// assumed to be the conservative, unconfigurable default. A small fixed pool
// (IMPORT_RPC_CONCURRENCY) bounds in-flight RPCs to a constant regardless of
// batch size, keeping wall-clock time roughly proportional to
// ceil(total / concurrency) instead of total, without needing per-request
// tuning.
// ===========================================================================

import { EXPORT_FORMAT, EXPORT_VERSION, MAX_RECIPES } from './adminRecipeExportShape';

export { EXPORT_FORMAT, EXPORT_VERSION, MAX_RECIPES };

export const IMPORT_RPC_CONCURRENCY = 8;

const invalidMsg = (field) => `Invalid value for "${field}"`;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Real boolean preserved (an explicit `false` is kept). absent / null -> the
// documented default (`false`). Any other supplied type ("true" / 1 / object
// / array) -> error -- never silently coerced to the default.
const normOptionalBool = (v, field, dflt) => {
  if (v === undefined || v === null) return { value: dflt };
  if (typeof v === 'boolean') return { value: v };
  return { error: invalidMsg(field) };
};

// Optional free text (notes / group_key). absent / null / blank string ->
// null. non-blank string -> preserved verbatim. any supplied non-string
// (number / boolean / object / array) -> error -- never silently nulled.
const normOptionalNotesText = (v, field) => {
  if (v === undefined || v === null) return { value: null };
  if (typeof v !== 'string') return { error: invalidMsg(field) };
  return { value: v.trim() === '' ? null : v };
};

// ---------------------------------------------------------------------------
// parseImportEnvelope
// ---------------------------------------------------------------------------
// Accepts only { format: "prepmeal.recipe-export", version: 1, recipes: [...] }
// with 1..MAX_RECIPES entries. A legacy raw-array file (the shape the old
// import route accepted) is rejected with a specific, actionable message --
// never guessed at / partially converted. Any other malformed envelope is
// rejected with a generic message before any DB work.
export function parseImportEnvelope(rawBody) {
  if (Array.isArray(rawBody)) {
    return {
      error:
        'Legacy array import format is not supported. Re-export recipes with the current admin export to get a valid envelope.',
    };
  }
  if (!isPlainObject(rawBody)) {
    return { error: 'Invalid request body' };
  }
  if (rawBody.format !== EXPORT_FORMAT) {
    return { error: `Unsupported import format. Expected format "${EXPORT_FORMAT}".` };
  }
  if (rawBody.version !== EXPORT_VERSION) {
    return { error: `Unsupported import version. Expected version ${EXPORT_VERSION}.` };
  }
  if (!Array.isArray(rawBody.recipes)) {
    return { error: invalidMsg('recipes') };
  }
  if (rawBody.recipes.length === 0) {
    return { error: 'No recipes to import' };
  }
  if (rawBody.recipes.length > MAX_RECIPES) {
    return { error: `Too many recipes: maximum ${MAX_RECIPES} per import` };
  }
  return { recipes: rawBody.recipes };
}

// ---------------------------------------------------------------------------
// collectReferenceKeys
// ---------------------------------------------------------------------------
// Best-effort, lenient scan across every recipe's ingredients array for
// string-typed ingredient_slug / unit_code values, deduplicated. Over-fetching
// a key that later turns out unused (because its recipe fails validation for
// an unrelated reason) is harmless; under-fetching would force a second
// round trip. Deep validation of any one recipe happens in
// resolveRecipeParams, not here.
export function collectReferenceKeys(recipes) {
  const ingredientSlugs = new Set();
  const unitCodes = new Set();

  for (const recipe of recipes) {
    const ingredients = isPlainObject(recipe) ? recipe.ingredients : undefined;
    if (!Array.isArray(ingredients)) continue;
    for (const item of ingredients) {
      if (!isPlainObject(item)) continue;
      if (typeof item.ingredient_slug === 'string' && item.ingredient_slug.trim() !== '') {
        ingredientSlugs.add(item.ingredient_slug);
      }
      if (typeof item.unit_code === 'string' && item.unit_code.trim() !== '') {
        unitCodes.add(item.unit_code);
      }
    }
  }

  return { ingredientSlugs: Array.from(ingredientSlugs), unitCodes: Array.from(unitCodes) };
}

// ---------------------------------------------------------------------------
// resolveRecipeParams
// ---------------------------------------------------------------------------
// One recipe in, one of { params } | { error } out. Never throws. `params`
// is a body-shaped object (same field names buildRecipeAtomicParams expects)
// with `ingredients` converted to { ingredient_id, unit_id, quantity,
// is_optional, notes, group_key } and `steps` renumbered from array order --
// ready to pass to buildRecipeAtomicParams() unchanged.
//
// ingredient_slug and unit_code are mandatory portable references: a
// name-only ingredient entry (no ingredient_slug), a missing unit_code, or a
// slug/code absent from the resolved lookup maps fails THIS recipe only --
// it never causes another recipe in the batch to fail, and never causes an
// ingredient or unit to be auto-created.
export function resolveRecipeParams(recipe, ingredientIdBySlug, unitIdByCode) {
  if (!isPlainObject(recipe)) {
    return { error: 'Invalid recipe entry' };
  }

  const rawIngredients = recipe.ingredients;
  const ingredients = [];
  if (rawIngredients !== undefined && rawIngredients !== null) {
    if (!Array.isArray(rawIngredients)) return { error: invalidMsg('ingredients') };
    for (let i = 0; i < rawIngredients.length; i += 1) {
      const item = rawIngredients[i];
      if (!isPlainObject(item)) {
        return { error: `Invalid ingredient at position ${i + 1}` };
      }
      const slug = item.ingredient_slug;
      const code = item.unit_code;
      if (typeof slug !== 'string' || slug.trim() === '') {
        return { error: `Ingredient at position ${i + 1} is missing "ingredient_slug"` };
      }
      if (typeof code !== 'string' || code.trim() === '') {
        return { error: `Ingredient at position ${i + 1} is missing "unit_code"` };
      }
      const ingredient_id = ingredientIdBySlug.get(slug);
      if (!ingredient_id) {
        return { error: `Unknown ingredient_slug "${slug}"` };
      }
      const unit_id = unitIdByCode.get(code);
      if (!unit_id) {
        return { error: `Unknown unit_code "${code}"` };
      }

      // is_optional / notes / group_key are strictly validated, not
      // leniently coerced: a supplied value of the wrong type (e.g.
      // is_optional: "true", notes: 5) fails this recipe with a clear error
      // instead of silently falling back to the absent-value default.
      const isOptionalCheck = normOptionalBool(item.is_optional, 'is_optional', false);
      if (isOptionalCheck.error) {
        return { error: `Ingredient at position ${i + 1}: ${isOptionalCheck.error}` };
      }
      const notesCheck = normOptionalNotesText(item.notes, 'notes');
      if (notesCheck.error) {
        return { error: `Ingredient at position ${i + 1}: ${notesCheck.error}` };
      }
      const groupKeyCheck = normOptionalNotesText(item.group_key, 'group_key');
      if (groupKeyCheck.error) {
        return { error: `Ingredient at position ${i + 1}: ${groupKeyCheck.error}` };
      }

      ingredients.push({
        ingredient_id,
        unit_id,
        quantity: item.quantity ?? null,
        is_optional: isOptionalCheck.value,
        notes: notesCheck.value,
        group_key: groupKeyCheck.value,
      });
    }
  }

  const rawSteps = recipe.steps;
  const steps = [];
  if (rawSteps !== undefined && rawSteps !== null) {
    if (!Array.isArray(rawSteps)) return { error: invalidMsg('steps') };
    for (let i = 0; i < rawSteps.length; i += 1) {
      const item = rawSteps[i];
      if (!isPlainObject(item)) {
        return { error: `Invalid step at position ${i + 1}` };
      }
      if (typeof item.text !== 'string' || item.text.trim() === '') {
        return { error: `Step at position ${i + 1} is missing "text"` };
      }
      // Client step_no is never trusted, present or not -- always recomputed
      // from array order.
      steps.push({
        step_no: i + 1,
        text: item.text,
        time_seconds: item.time_seconds ?? null,
      });
    }
  }

  const rest = { ...recipe };
  delete rest.ingredients;
  delete rest.steps;
  return { params: { ...rest, ingredients, steps } };
}

// ---------------------------------------------------------------------------
// runBoundedConcurrent
// ---------------------------------------------------------------------------
// Runs `worker(item, index)` for every item in `items`, with at most
// `concurrency` invocations in flight at once. Results are written back by
// index, so the returned array always matches input order regardless of
// which worker call finishes first.
export async function runBoundedConcurrent(items, worker, concurrency = IMPORT_RPC_CONCURRENCY) {
  const results = new Array(items.length);
  if (items.length === 0) return results;

  let nextIndex = 0;
  const poolSize = Math.max(1, Math.min(concurrency, items.length));

  async function runOneLane() {
    for (;;) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: poolSize }, runOneLane));
  return results;
}
