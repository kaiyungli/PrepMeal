import { describe, it, expect } from 'vitest';
import { buildRecipeExport, buildExportEnvelope, EXPORT_FORMAT, EXPORT_VERSION, MAX_RECIPES } from '@/lib/adminRecipeExportShape';

// Pure-unit matrix for src/lib/adminRecipeExportShape.js. No handler, no
// Supabase, no mocks.

const FULL_RECIPE_ROW = {
  id: 'r1',
  name: 'Garlic Broccoli',
  slug: 'garlic-broccoli',
  description: 'A quick side',
  cuisine: 'chinese',
  dish_type: 'side',
  difficulty: 'easy',
  prep_time_minutes: 5,
  cook_time_minutes: 7,
  base_servings: 3,
  image_url: 'http://example.test/a.jpg',
  calories_per_serving: 120,
  is_public: false,
  method: 'braised',
  speed: 'slow',
  servings_unit: 'plate',
  meal_role: 'protein_side',
  is_complete_meal: true,
  primary_protein: 'beef',
  budget_level: 'premium',
  reuse_group: 'g1',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('buildRecipeExport', () => {
  it('round-trips every canonical builder input, including all eight metadata fields and is_public', () => {
    const exported = buildRecipeExport(FULL_RECIPE_ROW, [], []);
    expect(exported).toMatchObject({
      name: 'Garlic Broccoli',
      slug: 'garlic-broccoli',
      description: 'A quick side',
      cuisine: 'chinese',
      dish_type: 'side',
      difficulty: 'easy',
      prep_time: 5,
      cook_time: 7,
      servings: 3,
      image_url: 'http://example.test/a.jpg',
      calories_per_serving: 120,
      is_public: false,
      method: 'braised',
      speed: 'slow',
      servings_unit: 'plate',
      meal_role: 'protein_side',
      is_complete_meal: true,
      primary_protein: 'beef',
      budget_level: 'premium',
      reuse_group: 'g1',
    });
  });

  it('maps sparse/nullable recipe fields to null, never undefined', () => {
    const minimal = {
      name: 'Plain',
      slug: 'plain',
      cuisine: 'chinese',
      dish_type: 'main',
      difficulty: 'easy',
      base_servings: 1,
      method: 'boiled',
      speed: 'normal',
    };
    const exported = buildRecipeExport(minimal, [], []);
    expect(Object.values(exported).some((v) => v === undefined)).toBe(false);
    expect(exported.description).toBeNull();
    expect(exported.prep_time).toBeNull();
    expect(exported.cook_time).toBeNull();
    expect(exported.image_url).toBeNull();
    expect(exported.calories_per_serving).toBeNull();
    expect(exported.servings_unit).toBeNull();
    expect(exported.meal_role).toBeNull();
    expect(exported.primary_protein).toBeNull();
    expect(exported.budget_level).toBeNull();
    expect(exported.reuse_group).toBeNull();
    expect(exported.is_public).toBe(false);
    expect(exported.is_complete_meal).toBe(false);
  });

  it('exports ingredient_slug, unit_code, quantity, is_optional, notes and group_key as supported by the live schema', () => {
    const ingredientRows = [
      { id: 'ri-1', quantity: 2, is_optional: true, prep_note: 'chopped', group_key: 'veg', ingredients: { slug: 'broccoli' }, units: { code: 'piece' } },
    ];
    const exported = buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, []);
    expect(exported.ingredients).toEqual([
      { ingredient_slug: 'broccoli', unit_code: 'piece', quantity: 2, is_optional: true, notes: 'chopped', group_key: 'veg' },
    ]);
  });

  it('exports ingredients in a deterministic order (by row id) regardless of input order', () => {
    const rowA = { id: 'a', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: 'a-slug' }, units: { code: 'g' } };
    const rowB = { id: 'b', quantity: 2, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: 'b-slug' }, units: { code: 'g' } };
    const forward = buildRecipeExport(FULL_RECIPE_ROW, [rowA, rowB], []);
    const reversed = buildRecipeExport(FULL_RECIPE_ROW, [rowB, rowA], []);
    expect(forward.ingredients.map((i) => i.ingredient_slug)).toEqual(['a-slug', 'b-slug']);
    expect(reversed.ingredients.map((i) => i.ingredient_slug)).toEqual(['a-slug', 'b-slug']);
  });

  it('exports steps in deterministic step_no order regardless of input row order', () => {
    const stepRows = [
      { id: 's3', step_no: 3, text: 'third', time_seconds: null },
      { id: 's1', step_no: 1, text: 'first', time_seconds: 10 },
      { id: 's2', step_no: 2, text: 'second', time_seconds: 20 },
    ];
    const exported = buildRecipeExport(FULL_RECIPE_ROW, [], stepRows);
    expect(exported.steps).toEqual([
      { step_no: 1, text: 'first', time_seconds: 10 },
      { step_no: 2, text: 'second', time_seconds: 20 },
      { step_no: 3, text: 'third', time_seconds: null },
    ]);
  });

  it('handles a recipe with no ingredients / no steps', () => {
    const exported = buildRecipeExport(FULL_RECIPE_ROW, [], []);
    expect(exported.ingredients).toEqual([]);
    expect(exported.steps).toEqual([]);
  });

  // R3 fix (item 3): a missing/blank/non-string portable reference must fail
  // the whole export, never be serialized as a null ingredient_slug/unit_code
  // -- a null reference cannot be re-imported (resolveRecipeParams requires
  // both as non-blank strings), so silently nulling it would produce a file
  // that looks valid but cannot be round-tripped.
  it('throws (fails closed) rather than serializing a null ingredient_slug when the ingredients join is missing', () => {
    const ingredientRows = [{ id: 'ri-1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: null, units: { code: 'g' } }];
    expect(() => buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, [])).toThrow(/ingredient slug/i);
  });

  it('throws (fails closed) rather than serializing a null unit_code when the units join is missing', () => {
    const ingredientRows = [{ id: 'ri-1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: 'broccoli' }, units: null }];
    expect(() => buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, [])).toThrow(/unit code/i);
  });

  it('throws when the joined ingredient slug is a blank string', () => {
    const ingredientRows = [{ id: 'ri-1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: '   ' }, units: { code: 'g' } }];
    expect(() => buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, [])).toThrow(/ingredient slug/i);
  });

  it('throws when the joined unit code is a blank string', () => {
    const ingredientRows = [{ id: 'ri-1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: 'broccoli' }, units: { code: '' } }];
    expect(() => buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, [])).toThrow(/unit code/i);
  });

  it('throws when the joined ingredient slug is a non-string value', () => {
    const ingredientRows = [{ id: 'ri-1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: 123 }, units: { code: 'g' } }];
    expect(() => buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, [])).toThrow(/ingredient slug/i);
  });

  it('throws when the joined unit code is a non-string value', () => {
    const ingredientRows = [{ id: 'ri-1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: 'broccoli' }, units: { code: [] } }];
    expect(() => buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, [])).toThrow(/unit code/i);
  });

  it('the thrown error identifies the offending recipe by slug', () => {
    const ingredientRows = [{ id: 'ri-42', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: null, units: { code: 'g' } }];
    expect(() => buildRecipeExport(FULL_RECIPE_ROW, ingredientRows, [])).toThrow(/garlic-broccoli/);
  });
});

describe('buildExportEnvelope', () => {
  it('produces the exact envelope contract with format, version, exported_at and recipes', () => {
    const recipes = [buildRecipeExport(FULL_RECIPE_ROW, [], [])];
    const env = buildExportEnvelope(recipes, '2026-09-11T00:00:00.000Z');
    expect(env).toEqual({
      format: 'prepmeal.recipe-export',
      version: 1,
      exported_at: '2026-09-11T00:00:00.000Z',
      recipes,
    });
    expect(env.format).toBe(EXPORT_FORMAT);
    expect(env.version).toBe(EXPORT_VERSION);
  });

  it('never truncates the recipes array', () => {
    const recipes = Array.from({ length: MAX_RECIPES }, (_, i) => buildRecipeExport({ ...FULL_RECIPE_ROW, slug: `r${i}` }, [], []));
    const env = buildExportEnvelope(recipes, 't');
    expect(env.recipes).toHaveLength(MAX_RECIPES);
  });

  it('is a pure function of its arguments (does not read the clock)', () => {
    const recipes = [buildRecipeExport(FULL_RECIPE_ROW, [], [])];
    const a = buildExportEnvelope(recipes, 'fixed-timestamp');
    const b = buildExportEnvelope(recipes, 'fixed-timestamp');
    expect(a).toEqual(b);
  });
});
