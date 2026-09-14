import { describe, it, expect, vi } from 'vitest';
import {
  parseImportEnvelope,
  collectReferenceKeys,
  resolveRecipeParams,
  runBoundedConcurrent,
  IMPORT_RPC_CONCURRENCY,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  MAX_RECIPES,
} from '@/lib/adminRecipeImportResolve';
import { buildRecipeExport, buildExportEnvelope } from '@/lib/adminRecipeExportShape';
import { buildRecipeAtomicParams } from '@/lib/adminRecipeAtomicParams';

// Pure-unit matrix for src/lib/adminRecipeImportResolve.js. No handler, no
// Supabase, no mocks other than fake in-memory worker functions for the
// concurrency runner.

const VALID_RECIPE = {
  name: 'Garlic Broccoli',
  slug: 'garlic-broccoli',
  cuisine: 'chinese',
  dish_type: 'side',
  difficulty: 'easy',
  ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', quantity: 1 }],
  steps: [{ text: 'Blanch' }],
};

function envelope(recipes: unknown[], overrides: Record<string, unknown> = {}) {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exported_at: 't', recipes, ...overrides };
}

describe('parseImportEnvelope', () => {
  it('accepts a well-formed envelope', () => {
    const result = parseImportEnvelope(envelope([VALID_RECIPE]));
    expect('recipes' in result && result.recipes).toEqual([VALID_RECIPE]);
  });

  it('rejects a legacy raw array with a specific, actionable message', () => {
    const result = parseImportEnvelope([VALID_RECIPE]);
    expect(result.error).toMatch(/legacy array/i);
  });

  it.each([
    ['null', null],
    ['a string', 'not-an-object'],
    ['a number', 42],
  ])('rejects a non-object body (%s)', (_label, body) => {
    const result = parseImportEnvelope(body);
    expect(result.error).toBe('Invalid request body');
  });

  it('rejects an unknown format', () => {
    const result = parseImportEnvelope(envelope([VALID_RECIPE], { format: 'legacy.raw' }));
    expect(result.error).toMatch(/Unsupported import format/);
  });

  it('rejects an unknown version', () => {
    const result = parseImportEnvelope(envelope([VALID_RECIPE], { version: 2 }));
    expect(result.error).toMatch(/Unsupported import version/);
  });

  it('rejects a non-array recipes field', () => {
    const result = parseImportEnvelope(envelope([VALID_RECIPE], { recipes: { 0: VALID_RECIPE } }));
    expect(result.error).toBe('Invalid value for "recipes"');
  });

  it('rejects an empty recipes array', () => {
    const result = parseImportEnvelope(envelope([]));
    expect(result.error).toBe('No recipes to import');
  });

  it('accepts exactly MAX_RECIPES recipes', () => {
    const recipes = Array.from({ length: MAX_RECIPES }, (_, i) => ({ ...VALID_RECIPE, slug: `r${i}` }));
    const result = parseImportEnvelope(envelope(recipes));
    expect('recipes' in result && result.recipes.length).toBe(MAX_RECIPES);
  });

  it('rejects MAX_RECIPES + 1 recipes before any lookup/RPC would happen', () => {
    const recipes = Array.from({ length: MAX_RECIPES + 1 }, (_, i) => ({ ...VALID_RECIPE, slug: `r${i}` }));
    const result = parseImportEnvelope(envelope(recipes));
    expect(result.error).toMatch(new RegExp(`maximum ${MAX_RECIPES}`));
  });
});

describe('collectReferenceKeys', () => {
  it('gathers deduplicated ingredient_slug and unit_code across recipes', () => {
    const recipes = [
      { ingredients: [{ ingredient_slug: 'a', unit_code: 'g' }, { ingredient_slug: 'b', unit_code: 'g' }] },
      { ingredients: [{ ingredient_slug: 'a', unit_code: 'ml' }] },
    ];
    const { ingredientSlugs, unitCodes } = collectReferenceKeys(recipes);
    expect(ingredientSlugs.sort()).toEqual(['a', 'b']);
    expect(unitCodes.sort()).toEqual(['g', 'ml']);
  });

  it('ignores recipes with no ingredients array, and non-object ingredient entries', () => {
    const recipes = [{}, { ingredients: null }, { ingredients: 'nope' }, { ingredients: [null, 5, { ingredient_slug: 'x', unit_code: 'g' }] }];
    const { ingredientSlugs, unitCodes } = collectReferenceKeys(recipes);
    expect(ingredientSlugs).toEqual(['x']);
    expect(unitCodes).toEqual(['g']);
  });

  it('ignores blank string references', () => {
    const recipes = [{ ingredients: [{ ingredient_slug: '  ', unit_code: '' }] }];
    const { ingredientSlugs, unitCodes } = collectReferenceKeys(recipes);
    expect(ingredientSlugs).toEqual([]);
    expect(unitCodes).toEqual([]);
  });
});

describe('resolveRecipeParams', () => {
  const ingredientMap = new Map([['broccoli', 'ing-1'], ['garlic', 'ing-2']]);
  const unitMap = new Map([['piece', 'unit-1'], ['g', 'unit-2']]);

  it('resolves a valid recipe: ingredient_slug/unit_code -> ingredient_id/unit_id, step_no recomputed', () => {
    const recipe = {
      ...VALID_RECIPE,
      ingredients: [
        { ingredient_slug: 'broccoli', unit_code: 'piece', quantity: 1, is_optional: true, notes: 'n', group_key: 'g1' },
        { ingredient_slug: 'garlic', unit_code: 'g', quantity: 5 },
      ],
      steps: [{ step_no: 99, text: 'first' }, { step_no: 1, text: 'second', time_seconds: 30 }],
    };
    const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
    expect(result.error).toBeUndefined();
    expect(result.params.ingredients).toEqual([
      { ingredient_id: 'ing-1', unit_id: 'unit-1', quantity: 1, is_optional: true, notes: 'n', group_key: 'g1' },
      { ingredient_id: 'ing-2', unit_id: 'unit-2', quantity: 5, is_optional: false, notes: null, group_key: null },
    ]);
    // input step_no (99, 1) is discarded; array order (1, 2) wins.
    expect(result.params.steps).toEqual([
      { step_no: 1, text: 'first', time_seconds: null },
      { step_no: 2, text: 'second', time_seconds: 30 },
    ]);
    expect(result.params.name).toBe(recipe.name);
    expect(result.params.slug).toBe(recipe.slug);
  });

  it('passes through recipes with no ingredients / no steps as empty arrays', () => {
    const result = resolveRecipeParams({ name: 'n', slug: 's' }, ingredientMap, unitMap);
    expect(result.params.ingredients).toEqual([]);
    expect(result.params.steps).toEqual([]);
  });

  it('rejects a non-object recipe entry', () => {
    expect(resolveRecipeParams(null, ingredientMap, unitMap).error).toBeTruthy();
    expect(resolveRecipeParams(['x'], ingredientMap, unitMap).error).toBeTruthy();
  });

  it('rejects a name-only ingredient reference (no ingredient_slug)', () => {
    const recipe = { ...VALID_RECIPE, ingredients: [{ name: '西蘭花', unit_code: 'piece', quantity: 1 }] };
    const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
    expect(result.error).toMatch(/ingredient_slug/);
  });

  it('rejects a missing unit_code', () => {
    const recipe = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', quantity: 1 }] };
    const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
    expect(result.error).toMatch(/unit_code/);
  });

  it('rejects an unknown ingredient_slug', () => {
    const recipe = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'nope', unit_code: 'piece', quantity: 1 }] };
    const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
    expect(result.error).toBe('Unknown ingredient_slug "nope"');
  });

  it('rejects an unknown unit_code', () => {
    const recipe = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'nope', quantity: 1 }] };
    const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
    expect(result.error).toBe('Unknown unit_code "nope"');
  });

  it('rejects a non-array ingredients / steps field', () => {
    expect(resolveRecipeParams({ ...VALID_RECIPE, ingredients: 'nope' }, ingredientMap, unitMap).error).toBe(
      'Invalid value for "ingredients"',
    );
    expect(resolveRecipeParams({ ...VALID_RECIPE, steps: 'nope' }, ingredientMap, unitMap).error).toBe(
      'Invalid value for "steps"',
    );
  });

  it('rejects a step missing text', () => {
    const recipe = { ...VALID_RECIPE, steps: [{ time_seconds: 5 }] };
    expect(resolveRecipeParams(recipe, ingredientMap, unitMap).error).toMatch(/missing "text"/);
  });

  it('never mutates quantity/is_optional/notes/group_key to undefined', () => {
    const recipe = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece' }] };
    const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
    const item = result.params.ingredients[0];
    expect(Object.values(item).some((v) => v === undefined)).toBe(false);
  });

  // R3 fix (item 5): is_optional / notes / group_key are strictly validated,
  // not leniently coerced -- a supplied value of the wrong type must fail the
  // recipe with a clear error rather than silently falling back to the
  // absent-value default.
  describe('strict optional ingredient fields (R3)', () => {
    it.each([
      ['a string "true"', 'true'],
      ['a string "false"', 'false'],
      ['the number 1', 1],
      ['the number 0', 0],
      ['an object', {}],
      ['an array', []],
    ])('rejects a supplied non-boolean is_optional (%s)', (_label, value) => {
      const recipe = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', is_optional: value }] };
      const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
      expect(result.error).toMatch(/is_optional/);
    });

    it('accepts an explicit boolean is_optional (true and false both preserved)', () => {
      const recipeTrue = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', is_optional: true }] };
      expect(resolveRecipeParams(recipeTrue, ingredientMap, unitMap).params.ingredients[0].is_optional).toBe(true);
      const recipeFalse = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', is_optional: false }] };
      expect(resolveRecipeParams(recipeFalse, ingredientMap, unitMap).params.ingredients[0].is_optional).toBe(false);
    });

    it('defaults is_optional to false when absent or null', () => {
      const absent = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece' }] };
      expect(resolveRecipeParams(absent, ingredientMap, unitMap).params.ingredients[0].is_optional).toBe(false);
      const nullVal = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', is_optional: null }] };
      expect(resolveRecipeParams(nullVal, ingredientMap, unitMap).params.ingredients[0].is_optional).toBe(false);
    });

    it.each([
      ['notes', 5],
      ['notes', true],
      ['notes', {}],
      ['notes', []],
      ['group_key', 5],
      ['group_key', true],
      ['group_key', {}],
      ['group_key', []],
    ])('rejects a supplied non-string %s (%j)', (field, value) => {
      const recipe = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', [field]: value }] };
      const result = resolveRecipeParams(recipe, ingredientMap, unitMap);
      expect(result.error).toMatch(new RegExp(field));
    });

    it.each(['notes', 'group_key'])('normalizes a blank string %s to null, and absent/null to null', (field) => {
      const blank = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', [field]: '   ' }] };
      expect(resolveRecipeParams(blank, ingredientMap, unitMap).params.ingredients[0][field]).toBeNull();
      const absent = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece' }] };
      expect(resolveRecipeParams(absent, ingredientMap, unitMap).params.ingredients[0][field]).toBeNull();
      const nullVal = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', [field]: null }] };
      expect(resolveRecipeParams(nullVal, ingredientMap, unitMap).params.ingredients[0][field]).toBeNull();
    });

    it.each(['notes', 'group_key'])('preserves a non-blank string %s verbatim', (field) => {
      const recipe = { ...VALID_RECIPE, ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', [field]: 'chopped fine' }] };
      expect(resolveRecipeParams(recipe, ingredientMap, unitMap).params.ingredients[0][field]).toBe('chopped fine');
    });
  });
});

describe('runBoundedConcurrent', () => {
  it('preserves input order in the result array regardless of completion order', async () => {
    const items = [30, 10, 20, 5];
    const results = await runBoundedConcurrent(items, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms;
    }, 4);
    expect(results).toEqual(items);
  });

  it('never runs more than `concurrency` workers at once', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    await runBoundedConcurrent(items, async (i) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return i;
    }, 5);
    expect(maxActive).toBeLessThanOrEqual(5);
    expect(maxActive).toBeGreaterThan(1);
  });

  it('defaults to IMPORT_RPC_CONCURRENCY when no concurrency is given', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: IMPORT_RPC_CONCURRENCY + 10 }, (_, i) => i);
    await runBoundedConcurrent(items, async (i) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return i;
    });
    expect(maxActive).toBeLessThanOrEqual(IMPORT_RPC_CONCURRENCY);
  });

  it('propagates mixed success/failure results at their original positions', async () => {
    const items = ['ok', 'fail', 'ok'];
    const worker = vi.fn(async (item: string) => (item === 'fail' ? { error: 'boom' } : { success: true }));
    const results = await runBoundedConcurrent(items, worker, 2);
    expect(results).toEqual([{ success: true }, { error: 'boom' }, { success: true }]);
  });

  it('handles zero items', async () => {
    const results = await runBoundedConcurrent([], async () => 'x', 4);
    expect(results).toEqual([]);
  });
});

describe('round trip: export -> resolve -> buildRecipeAtomicParams', () => {
  it('an exported recipe resolves and builds to exactly the 22 canonical keys with no undefined values', () => {
    const recipeRow = {
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
    };
    const ingredientRows = [
      { id: '1', quantity: 2, is_optional: true, prep_note: 'chopped', group_key: null, ingredients: { slug: 'broccoli' }, units: { code: 'piece' } },
    ];
    const stepRows = [{ id: 's1', step_no: 1, text: 'Blanch', time_seconds: 30 }];

    const exported = buildRecipeExport(recipeRow, ingredientRows, stepRows);
    const env = buildExportEnvelope([exported], '2026-01-01T00:00:00.000Z');
    expect(env.format).toBe(EXPORT_FORMAT);
    expect(env.version).toBe(EXPORT_VERSION);

    const parsed = parseImportEnvelope(env);
    expect('recipes' in parsed).toBe(true);

    const ingredientMap = new Map([['broccoli', 'ing-1']]);
    const unitMap = new Map([['piece', 'unit-1']]);
    const resolved = resolveRecipeParams(('recipes' in parsed && parsed.recipes[0]) as Record<string, unknown>, ingredientMap, unitMap);
    expect(resolved.error).toBeUndefined();

    const built = buildRecipeAtomicParams(resolved.params);
    expect(built.error).toBeUndefined();
    const keys = Object.keys(built.params).sort();
    expect(keys).toHaveLength(22);
    expect(Object.values(built.params).some((v) => v === undefined)).toBe(false);
    expect(built.params.p_name).toBe('Garlic Broccoli');
    expect(built.params.p_method).toBe('braised');
    expect(built.params.p_is_complete_meal).toBe(true);
    expect(built.params.p_ingredients).toEqual([
      { ingredient_id: 'ing-1', unit_id: 'unit-1', quantity: 2, is_optional: true, notes: 'chopped', group_key: null },
    ]);
    expect(built.params.p_steps).toEqual([{ step_no: 1, text: 'Blanch', time_seconds: 30 }]);
  });
});
