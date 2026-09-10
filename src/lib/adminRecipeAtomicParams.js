// ===========================================================================
// adminRecipeAtomicParams
// ---------------------------------------------------------------------------
// Pure request-boundary validator + payload builder for the canonical admin
// recipe RPCs:
//
//   admin_create_recipe_atomic  -- 22 required named args
//   admin_update_recipe_atomic  -- 23 required named args (p_recipe_id + the 22)
//
// PURE JAVASCRIPT. No Supabase / client / server / env / Next imports, so this
// module is safe to import from any API route -- src/pages/api/admin/recipes/
// index.js today, and the bulk-import route (import.js) later -- and to unit
// test in isolation.
//
// WHY A HARD BOUNDARY
// ---------------------------------------------------------------------------
// PostgREST resolves an RPC overload from the exact set of keys present in the
// JSON body, and JSON.stringify drops any key whose value is `undefined`. Every
// built param must therefore be a concrete JSON value (null / integer /
// boolean / string / array), never `undefined`. Beyond that, malformed input
// is rejected with a stable, generic 400 BEFORE the RPC is ever called -- never
// a Postgres CHECK / NOT NULL error, and never a silent coercion (a supplied
// object is not turned into `[]`, a fractional number is not rounded).
//
// Error messages are generic and never echo the supplied value:
//   { error: 'Invalid value for "<field>"' }   |   { error: 'Invalid request body' }
//
// LIVE CONSTRAINTS (confirmed read-only, project hivnajhqqvaokthzhugx,
// information_schema + pg_constraint, 2026-09-10):
//   NOT NULL, no default : name, cuisine, dish_type, difficulty, method, speed
//   NOT NULL, w/ default : base_servings (1), is_public (true), is_complete_meal (false)
//   nullable             : slug (UNIQUE), description, image_url, servings_unit ('portion'),
//                          prep_time_minutes, cook_time_minutes, calories_per_serving,
//                          meal_role, primary_protein, budget_level, reuse_group
//   CHECK                : base_servings > 0 ; cuisine/dish_type/difficulty/method/speed IN (enum) ;
//                          meal_role/primary_protein/budget_level IS NULL OR IN (enum)
//   NO CHECK on prep_time_minutes / cook_time_minutes / calories_per_serving
//
// calories_per_serving: the production column is `integer`. The RPC parameter
// is `numeric` (kept as-is to avoid another signature migration), but this
// validator guarantees an INTEGER or null -- a fractional value that Postgres
// would silently round is rejected at 400, not sent.
//
// is_public: an absent / null value at the API boundary -> false (fail-safe).
// RecipeForm always sends an explicit boolean, so "absent" is never a UI
// request; a partial / non-UI call must not silently publish a recipe. The
// column default `true` and the RecipeForm form-state default `true` govern the
// explicit-value happy path only. is_complete_meal absent/null -> false.
//
// ENUM SETS below are the CANONICAL BACKEND copy, verbatim from the live CHECK
// constraints. There is no existing shared module whose values match: this repo
// has no meal_role / budget_level allow-list outside this file;
// src/constants/taxonomy.ts is display-oriented and diverges (its DISH_TYPE_MAP
// omits 'snack', its PROTEIN_MAP omits 'vegetarian'). Converging RecipeForm.js
// (whose primaryProteinOptions omits 'seafood') and taxonomy.ts onto this
// module is a separate, bounded follow-up -- it touches client display code and
// is out of scope for this backend-contract slice.
// ===========================================================================

export const CUISINES = ['chinese', 'western', 'japanese', 'korean', 'thai', 'fusion'];
export const DISH_TYPES = ['main', 'side', 'soup', 'staple', 'snack'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const METHODS = ['stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked'];
export const SPEEDS = ['quick', 'normal', 'slow'];
export const MEAL_ROLES = ['complete_meal', 'protein_main', 'veg_side', 'protein_side', 'soup'];
export const PRIMARY_PROTEINS = [
  'chicken', 'beef', 'pork', 'fish', 'seafood', 'shrimp', 'tofu', 'egg', 'vegetarian', 'mixed',
];
export const BUDGET_LEVELS = ['budget', 'normal', 'premium'];

const invalidMsg = (field) => `Invalid value for "${field}"`;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Optional free text. absent / null / blank string -> null. non-blank string
// -> preserved verbatim. any supplied non-string (number / boolean / object /
// array) -> error (never silently nulled).
const normOptionalText = (v, field) => {
  if (v === undefined || v === null) return { value: null };
  if (typeof v !== 'string') return { error: invalidMsg(field) };
  return { value: v.trim() === '' ? null : v };
};

// Real boolean preserved (an explicit `false` is kept). absent / null -> the
// documented default. Any other supplied type ("false" / "true" / 0 / 1 /
// object / array) -> error.
const normBool = (v, field, dflt) => {
  if (typeof v === 'boolean') return { value: v };
  if (v === undefined || v === null) return { value: dflt };
  return { error: invalidMsg(field) };
};

// Array preserved as-is. absent / null -> []. Any other supplied type -> error
// (never silently coerced to []).
const normArray = (v, field) => {
  if (v === undefined || v === null) return { value: [] };
  if (Array.isArray(v)) return { value: v };
  return { error: invalidMsg(field) };
};

// Integer field. blank / null / absent -> whenBlank. A number, or a numeric
// string whose value is an integer ("12", "20.0"), -> that integer. fractional
// / NaN / Infinity / boolean / object / array / non-numeric string / < min
// -> error.
const normInteger = (v, field, min, whenBlank) => {
  if (isBlank(v)) return { value: whenBlank };
  if (typeof v !== 'number' && typeof v !== 'string') return { error: invalidMsg(field) };
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { error: invalidMsg(field) };
  if (n < min) return { error: invalidMsg(field) };
  return { value: n };
};

// Nullable enum. blank / null / absent -> null. Member of the allow-list
// -> the value. Anything else -> error.
const normOptionalEnum = (v, field, allowed) => {
  if (isBlank(v)) return { value: null };
  if (typeof v === 'string' && allowed.includes(v)) return { value: v };
  return { error: invalidMsg(field) };
};

/**
 * Validate an admin recipe request body and build the 22 shared canonical
 * params for admin_create_recipe_atomic / admin_update_recipe_atomic. The PUT
 * route prepends `p_recipe_id` from the query string; this helper owns only the
 * body-derived params.
 *
 * On success every returned param is a concrete value (null / integer /
 * boolean / string / array) -- `JSON.parse(JSON.stringify(params))` has exactly
 * the same 22 keys with no `undefined`.
 *
 * @param {unknown} rawBody parsed request body (null / undefined tolerated -> {})
 * @returns {{ params: Record<string, unknown> } | { error: string }}
 */
export function buildRecipeAtomicParams(rawBody) {
  // Request-body shape: null / undefined -> {}; array / string / number /
  // boolean -> 400.
  if (rawBody !== undefined && rawBody !== null && !isPlainObject(rawBody)) {
    return { error: 'Invalid request body' };
  }
  const b = isPlainObject(rawBody) ? rawBody : {};

  // Required text -- NOT NULL (name) / product-required + UNIQUE (slug). Never
  // invented: a missing or blank value is a 400, not a synthesised default.
  if (!(typeof b.name === 'string' && b.name.trim() !== '')) return { error: invalidMsg('name') };
  if (!(typeof b.slug === 'string' && b.slug.trim() !== '')) return { error: invalidMsg('slug') };
  // Required enums -- NOT NULL + live CHECK.
  if (typeof b.cuisine !== 'string' || !CUISINES.includes(b.cuisine)) return { error: invalidMsg('cuisine') };
  if (typeof b.dish_type !== 'string' || !DISH_TYPES.includes(b.dish_type)) return { error: invalidMsg('dish_type') };
  if (typeof b.difficulty !== 'string' || !DIFFICULTIES.includes(b.difficulty)) return { error: invalidMsg('difficulty') };

  // First failing check wins, in this fixed order.
  const checks = {
    is_public: normBool(b.is_public, 'is_public', false),
    is_complete_meal: normBool(b.is_complete_meal, 'is_complete_meal', false),
    prep_time: normInteger(b.prep_time, 'prep_time', 0, null),
    cook_time: normInteger(b.cook_time, 'cook_time', 0, null),
    servings: normInteger(b.servings, 'servings', 1, 1),
    calories: normInteger(b.calories_per_serving, 'calories_per_serving', 0, null),
    ingredients: normArray(b.ingredients, 'ingredients'),
    steps: normArray(b.steps, 'steps'),
    description: normOptionalText(b.description, 'description'),
    image_url: normOptionalText(b.image_url, 'image_url'),
    servings_unit: normOptionalText(b.servings_unit, 'servings_unit'),
    reuse_group: normOptionalText(b.reuse_group, 'reuse_group'),
    method: normOptionalEnum(b.method, 'method', METHODS),
    speed: normOptionalEnum(b.speed, 'speed', SPEEDS),
    meal_role: normOptionalEnum(b.meal_role, 'meal_role', MEAL_ROLES),
    primary_protein: normOptionalEnum(b.primary_protein, 'primary_protein', PRIMARY_PROTEINS),
    budget_level: normOptionalEnum(b.budget_level, 'budget_level', BUDGET_LEVELS),
  };
  for (const result of Object.values(checks)) {
    if (result.error) return { error: result.error };
  }

  return {
    params: {
      p_name: b.name,
      p_slug: b.slug,
      p_description: checks.description.value,
      p_cuisine: b.cuisine,
      p_dish_type: b.dish_type,
      p_difficulty: b.difficulty,
      p_prep_time_minutes: checks.prep_time.value,
      p_cook_time_minutes: checks.cook_time.value,
      p_base_servings: checks.servings.value,
      p_image_url: checks.image_url.value,
      p_calories_per_serving: checks.calories.value,
      p_is_public: checks.is_public.value,
      p_method: checks.method.value,
      p_speed: checks.speed.value,
      p_servings_unit: checks.servings_unit.value,
      p_meal_role: checks.meal_role.value,
      p_is_complete_meal: checks.is_complete_meal.value,
      p_primary_protein: checks.primary_protein.value,
      p_budget_level: checks.budget_level.value,
      p_reuse_group: checks.reuse_group.value,
      p_ingredients: checks.ingredients.value,
      p_steps: checks.steps.value,
    },
  };
}
