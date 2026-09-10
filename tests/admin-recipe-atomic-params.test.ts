import { describe, it, expect } from 'vitest';
import {
  buildRecipeAtomicParams,
  CUISINES,
  DISH_TYPES,
  DIFFICULTIES,
  METHODS,
  SPEEDS,
  MEAL_ROLES,
  PRIMARY_PROTEINS,
  BUDGET_LEVELS,
} from '@/lib/adminRecipeAtomicParams';

// Pure-unit exhaustive matrix for the request-boundary validator +
// canonical-payload builder shared by src/pages/api/admin/recipes/index.js
// (and, later, the bulk-import route). No handler, no mocks, no Supabase.
//
// Contract:
//  - buildRecipeAtomicParams(body) -> { params } | { error }
//  - `params` (create shape) has EXACTLY these 22 keys, every value a concrete
//    JSON value (null / integer / boolean / string / array), never undefined.
//  - `error` is a stable generic string, never echoing the supplied value.

const CANONICAL_KEYS = [
  'p_name',
  'p_slug',
  'p_description',
  'p_cuisine',
  'p_dish_type',
  'p_difficulty',
  'p_prep_time_minutes',
  'p_cook_time_minutes',
  'p_base_servings',
  'p_image_url',
  'p_calories_per_serving',
  'p_is_public',
  'p_method',
  'p_speed',
  'p_servings_unit',
  'p_meal_role',
  'p_is_complete_meal',
  'p_primary_protein',
  'p_budget_level',
  'p_reuse_group',
  'p_ingredients',
  'p_steps',
].sort();

// The 5 NOT-NULL / product-required fields; everything else is optional/defaulted.
const REQUIRED_MIN = {
  name: 'Test Recipe',
  slug: 'test-recipe',
  cuisine: 'chinese',
  dish_type: 'main',
  difficulty: 'easy',
};

const FULL = {
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
  ingredients: [{ ingredient_id: 'i1', quantity: 2, unit_id: 'u1', is_optional: true, notes: 'n', group_key: null }],
  steps: [{ step_no: 1, text: 't', time_seconds: 30 }],
};

function ok(body: unknown): Record<string, unknown> {
  const r = buildRecipeAtomicParams(body) as { params?: Record<string, unknown>; error?: string };
  expect(r.error, `expected success, got error: ${r.error}`).toBeUndefined();
  expect(r.params).toBeDefined();
  return r.params as Record<string, unknown>;
}

function err(body: unknown): string {
  const r = buildRecipeAtomicParams(body) as { params?: unknown; error?: string };
  expect(r.params, 'expected an error, got params').toBeUndefined();
  expect(typeof r.error).toBe('string');
  return r.error as string;
}

describe('adminRecipeAtomicParams: enum sets match the live CHECK constraints', () => {
  it('are the exact production allow-lists (order-independent)', () => {
    expect([...CUISINES].sort()).toEqual(['chinese', 'fusion', 'japanese', 'korean', 'thai', 'western']);
    expect([...DISH_TYPES].sort()).toEqual(['main', 'side', 'snack', 'soup', 'staple']);
    expect([...DIFFICULTIES].sort()).toEqual(['easy', 'hard', 'medium']);
    expect([...METHODS].sort()).toEqual(['baked', 'boiled', 'braised', 'fried', 'steamed', 'stir_fry']);
    expect([...SPEEDS].sort()).toEqual(['normal', 'quick', 'slow']);
    expect([...MEAL_ROLES].sort()).toEqual(['complete_meal', 'protein_main', 'protein_side', 'soup', 'veg_side']);
    expect([...PRIMARY_PROTEINS].sort()).toEqual(
      ['beef', 'chicken', 'egg', 'fish', 'mixed', 'pork', 'seafood', 'shrimp', 'tofu', 'vegetarian'],
    );
    expect([...BUDGET_LEVELS].sort()).toEqual(['budget', 'normal', 'premium']);
  });
});

describe('adminRecipeAtomicParams: request body shape', () => {
  it.each([
    ['array', [1, 2, 3]],
    ['string', 'a recipe'],
    ['number', 42],
    ['boolean', true],
  ])('%s body -> { error: "Invalid request body" }', (_label, body) => {
    expect(err(body)).toBe('Invalid request body');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('%s body is treated as {} -> fails required-field validation, not "Invalid request body"', (_label, body) => {
    expect(err(body)).toBe('Invalid value for "name"');
  });

  it('plain object with the required fields -> success', () => {
    expect(ok(REQUIRED_MIN)).toBeTruthy();
  });
});

describe('adminRecipeAtomicParams: required text / enums', () => {
  it.each([
    ['missing name', { name: undefined }, 'name'],
    ['blank name', { name: '   ' }, 'name'],
    ['non-string name', { name: 123 }, 'name'],
    ['missing slug', { slug: undefined }, 'slug'],
    ['blank slug', { slug: '' }, 'slug'],
    ['non-string slug', { slug: {} }, 'slug'],
    ['missing cuisine', { cuisine: undefined }, 'cuisine'],
    ['unknown cuisine', { cuisine: 'klingon' }, 'cuisine'],
    ['non-string cuisine', { cuisine: 1 }, 'cuisine'],
    ['missing dish_type', { dish_type: undefined }, 'dish_type'],
    ['unknown dish_type', { dish_type: 'brunch' }, 'dish_type'],
    ['missing difficulty', { difficulty: undefined }, 'difficulty'],
    ['unknown difficulty', { difficulty: 'trivial' }, 'difficulty'],
  ])('%s -> 400 for that field', (_label, patch, field) => {
    expect(err({ ...REQUIRED_MIN, ...patch })).toBe(`Invalid value for "${field}"`);
  });

  it('name / slug / required enums are forwarded verbatim', () => {
    const p = ok(REQUIRED_MIN);
    expect(p.p_name).toBe('Test Recipe');
    expect(p.p_slug).toBe('test-recipe');
    expect(p.p_cuisine).toBe('chinese');
    expect(p.p_dish_type).toBe('main');
    expect(p.p_difficulty).toBe('easy');
  });

  it('every allowed dish_type value (incl. "snack") is accepted', () => {
    for (const dt of DISH_TYPES) expect(ok({ ...REQUIRED_MIN, dish_type: dt }).p_dish_type).toBe(dt);
  });

  it('every allowed primary_protein value (incl. "seafood" and "vegetarian") is accepted', () => {
    for (const pp of PRIMARY_PROTEINS) {
      expect(ok({ ...REQUIRED_MIN, primary_protein: pp }).p_primary_protein).toBe(pp);
    }
  });
});

describe('adminRecipeAtomicParams: optional / RPC-default enums', () => {
  it.each([
    ['method', 'wok', 'method'],
    ['speed', 'instant', 'speed'],
    ['meal_role', 'dessert', 'meal_role'],
    ['primary_protein', 'unicorn', 'primary_protein'],
    ['budget_level', 'lavish', 'budget_level'],
  ])('unknown %s -> 400', (key, bad, field) => {
    expect(err({ ...REQUIRED_MIN, [key]: bad })).toBe(`Invalid value for "${field}"`);
  });

  it('absent method/speed and nullable enums -> null', () => {
    const p = ok(REQUIRED_MIN);
    expect(p.p_method).toBeNull();
    expect(p.p_speed).toBeNull();
    expect(p.p_meal_role).toBeNull();
    expect(p.p_primary_protein).toBeNull();
    expect(p.p_budget_level).toBeNull();
  });

  it('blank-string enum -> null (not an error)', () => {
    const p = ok({ ...REQUIRED_MIN, method: '', meal_role: '   ', budget_level: '' });
    expect(p.p_method).toBeNull();
    expect(p.p_meal_role).toBeNull();
    expect(p.p_budget_level).toBeNull();
  });

  it('valid enum values are forwarded', () => {
    const p = ok({ ...REQUIRED_MIN, method: 'baked', speed: 'quick', meal_role: 'soup', budget_level: 'budget' });
    expect(p.p_method).toBe('baked');
    expect(p.p_speed).toBe('quick');
    expect(p.p_meal_role).toBe('soup');
    expect(p.p_budget_level).toBe('budget');
  });
});

describe('adminRecipeAtomicParams: booleans (is_public, is_complete_meal)', () => {
  it.each([
    ['is_public', true],
    ['is_public', false],
    ['is_complete_meal', true],
    ['is_complete_meal', false],
  ])('explicit %s=%s is preserved', (key, val) => {
    expect(ok({ ...REQUIRED_MIN, [key]: val })[`p_${key}`]).toBe(val);
  });

  it('absent is_public -> false (fail-safe); absent is_complete_meal -> false', () => {
    const p = ok(REQUIRED_MIN);
    expect(p.p_is_public).toBe(false);
    expect(p.p_is_complete_meal).toBe(false);
  });

  it('null is_public -> false; null is_complete_meal -> false', () => {
    const p = ok({ ...REQUIRED_MIN, is_public: null, is_complete_meal: null });
    expect(p.p_is_public).toBe(false);
    expect(p.p_is_complete_meal).toBe(false);
  });

  it.each([
    ['is_public', '"false" string', 'false'],
    ['is_public', '"true" string', 'true'],
    ['is_public', '0', 0],
    ['is_public', '1', 1],
    ['is_public', 'object', {}],
    ['is_public', 'array', []],
    ['is_complete_meal', '"false" string', 'false'],
    ['is_complete_meal', '1', 1],
  ])('%s as %s -> 400', (key, _label, val) => {
    expect(err({ ...REQUIRED_MIN, [key]: val })).toBe(`Invalid value for "${key}"`);
  });
});

describe('adminRecipeAtomicParams: integer fields (prep_time, cook_time, servings, calories_per_serving)', () => {
  it('blank/absent prep_time & cook_time -> null; blank/absent servings -> 1; blank calories -> null', () => {
    const p = ok({ ...REQUIRED_MIN, prep_time: '', cook_time: null });
    expect(p.p_prep_time_minutes).toBeNull();
    expect(p.p_cook_time_minutes).toBeNull();
    expect(p.p_base_servings).toBe(1);
    expect(p.p_calories_per_serving).toBeNull();
  });

  it.each([
    ['integer number', { prep_time: 12 }, 'p_prep_time_minutes', 12],
    ['integer string', { prep_time: '12' }, 'p_prep_time_minutes', 12],
    ['integer-valued decimal string', { cook_time: '20.0' }, 'p_cook_time_minutes', 20],
    ['servings integer string', { servings: '4' }, 'p_base_servings', 4],
    ['servings 1 (CHECK boundary)', { servings: 1 }, 'p_base_servings', 1],
    ['prep_time 0 (defensive min)', { prep_time: 0 }, 'p_prep_time_minutes', 0],
    ['calories integer', { calories_per_serving: 450 }, 'p_calories_per_serving', 450],
    ['calories integer string', { calories_per_serving: '450' }, 'p_calories_per_serving', 450],
    ['calories integer-valued decimal string', { calories_per_serving: '450.0' }, 'p_calories_per_serving', 450],
    ['calories 0', { calories_per_serving: 0 }, 'p_calories_per_serving', 0],
  ])('valid %s normalizes to an integer', (_label, patch, key, expected) => {
    expect(ok({ ...REQUIRED_MIN, ...patch })[key]).toBe(expected);
  });

  it.each([
    ['fractional prep_time', { prep_time: 5.5 }, 'prep_time'],
    ['fractional cook_time string', { cook_time: '7.25' }, 'cook_time'],
    ['fractional servings', { servings: 2.5 }, 'servings'],
    ['fractional calories (would be silently rounded by Postgres)', { calories_per_serving: 320.5 }, 'calories_per_serving'],
    ['fractional calories string', { calories_per_serving: '320.5' }, 'calories_per_serving'],
    ['non-numeric string', { prep_time: 'soon' }, 'prep_time'],
    ['"Infinity" string', { cook_time: 'Infinity' }, 'cook_time'],
    ['actual Infinity', { calories_per_serving: Number.POSITIVE_INFINITY }, 'calories_per_serving'],
    ['NaN', { servings: Number.NaN }, 'servings'],
    ['boolean', { prep_time: true }, 'prep_time'],
    ['object', { cook_time: {} }, 'cook_time'],
    ['array', { servings: [3] }, 'servings'],
    ['negative prep_time (defensive min 0)', { prep_time: -1 }, 'prep_time'],
    ['negative cook_time (defensive min 0)', { cook_time: -30 }, 'cook_time'],
    ['negative calories (defensive min 0)', { calories_per_serving: -1 }, 'calories_per_serving'],
    ['servings 0 (< live CHECK base_servings > 0)', { servings: 0 }, 'servings'],
    ['servings -2 (< live CHECK)', { servings: -2 }, 'servings'],
  ])('invalid %s -> 400 for that field', (_label, patch, field) => {
    expect(err({ ...REQUIRED_MIN, ...patch })).toBe(`Invalid value for "${field}"`);
  });
});

describe('adminRecipeAtomicParams: optional free text (description, image_url, servings_unit, reuse_group)', () => {
  it('absent / null / blank -> null', () => {
    const p = ok({ ...REQUIRED_MIN, description: '', image_url: '   ', servings_unit: null });
    expect(p.p_description).toBeNull();
    expect(p.p_image_url).toBeNull();
    expect(p.p_servings_unit).toBeNull();
    expect(p.p_reuse_group).toBeNull();
  });

  it('non-blank strings are preserved verbatim', () => {
    const p = ok({
      ...REQUIRED_MIN,
      description: '  keep spaces  ',
      image_url: 'http://x/y.png',
      servings_unit: 'bowl',
      reuse_group: 'weeknight',
    });
    expect(p.p_description).toBe('  keep spaces  ');
    expect(p.p_image_url).toBe('http://x/y.png');
    expect(p.p_servings_unit).toBe('bowl');
    expect(p.p_reuse_group).toBe('weeknight');
  });

  it.each([
    ['number description', { description: 123 }, 'description'],
    ['boolean image_url', { image_url: true }, 'image_url'],
    ['object servings_unit', { servings_unit: {} }, 'servings_unit'],
    ['array reuse_group', { reuse_group: ['a'] }, 'reuse_group'],
  ])('%s -> 400 (never silently nulled)', (_label, patch, field) => {
    expect(err({ ...REQUIRED_MIN, ...patch })).toBe(`Invalid value for "${field}"`);
  });
});

describe('adminRecipeAtomicParams: arrays (ingredients, steps)', () => {
  it('absent -> []; null -> []', () => {
    expect(ok(REQUIRED_MIN).p_ingredients).toEqual([]);
    expect(ok(REQUIRED_MIN).p_steps).toEqual([]);
    const p = ok({ ...REQUIRED_MIN, ingredients: null, steps: null });
    expect(p.p_ingredients).toEqual([]);
    expect(p.p_steps).toEqual([]);
  });

  it('real arrays preserved by content', () => {
    const ingredients = [{ ingredient_id: 'i', quantity: 1, unit_id: 'u' }];
    const steps = [{ step_no: 1, text: 'x' }];
    const p = ok({ ...REQUIRED_MIN, ingredients, steps });
    expect(p.p_ingredients).toEqual(ingredients);
    expect(p.p_steps).toEqual(steps);
  });

  it.each([
    ['object ingredients', { ingredients: { 0: 'x' } }, 'ingredients'],
    ['string ingredients', { ingredients: 'i1,i2' }, 'ingredients'],
    ['number ingredients', { ingredients: 3 }, 'ingredients'],
    ['boolean ingredients', { ingredients: true }, 'ingredients'],
    ['object steps', { steps: {} }, 'steps'],
    ['string steps', { steps: 'step one' }, 'steps'],
  ])('%s -> 400 (never coerced to [])', (_label, patch, field) => {
    expect(err({ ...REQUIRED_MIN, ...patch })).toBe(`Invalid value for "${field}"`);
  });
});

describe('adminRecipeAtomicParams: output shape (serialization safety)', () => {
  it('minimal-valid body -> exactly the 22 canonical keys, no undefined, JSON round-trips', () => {
    const p = ok(REQUIRED_MIN);
    expect(Object.values(p).some((v) => v === undefined)).toBe(false);
    const round = JSON.parse(JSON.stringify(p));
    expect(Object.keys(round).sort()).toEqual(CANONICAL_KEYS);
    expect(Object.keys(round)).toHaveLength(22);
  });

  it('full body -> exactly the 22 canonical keys; every value preserved and JSON-safe', () => {
    const p = ok(FULL);
    expect(Object.values(p).every((v) => v !== undefined)).toBe(true);
    const round = JSON.parse(JSON.stringify(p));
    expect(Object.keys(round).sort()).toEqual(CANONICAL_KEYS);
    expect(round).toEqual({
      p_name: 'Garlic Broccoli',
      p_slug: 'garlic-broccoli',
      p_description: 'A quick side',
      p_cuisine: 'chinese',
      p_dish_type: 'side',
      p_difficulty: 'easy',
      p_prep_time_minutes: 5,
      p_cook_time_minutes: 7,
      p_base_servings: 3,
      p_image_url: 'http://example.test/a.jpg',
      p_calories_per_serving: 120,
      p_is_public: false,
      p_method: 'braised',
      p_speed: 'slow',
      p_servings_unit: 'plate',
      p_meal_role: 'protein_side',
      p_is_complete_meal: true,
      p_primary_protein: 'beef',
      p_budget_level: 'premium',
      p_reuse_group: 'g1',
      p_ingredients: FULL.ingredients,
      p_steps: FULL.steps,
    });
  });

  it('every canonical key is an own property and not undefined for a body with only { name }-worth of data', () => {
    const p = ok(REQUIRED_MIN);
    for (const key of CANONICAL_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(p, key), `${key} present`).toBe(true);
      expect(p[key], `${key} defined`).not.toBeUndefined();
    }
  });
});
