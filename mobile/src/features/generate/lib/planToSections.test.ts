/**
 * Unit tests for the pure WeeklyPlan -> SectionList transform.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { planHasRecipes, planToSections } from './planToSections.ts';
import type { GenerateRecipe, WeeklyPlan } from '../types.ts';

const r = (id: string): GenerateRecipe =>
  ({
    id,
    slug: null,
    name: id,
    image_url: null,
    description: null,
    cuisine: null,
    dish_type: null,
    method: null,
    speed: null,
    primary_protein: null,
    protein: [],
    diet: [],
    flavor: null,
    is_complete_meal: false,
    meal_role: null,
    total_time_minutes: null,
    difficulty: null,
  }) satisfies GenerateRecipe;

const fullPlan: WeeklyPlan = {
  mon: [r('a')],
  tue: [r('b')],
  wed: [r('c')],
  thu: [r('d')],
  fri: [r('e')],
  sat: [r('f')],
  sun: [r('g')],
};

test('slices to daysPerWeek, in mon..sun order', () => {
  assert.deepEqual(
    planToSections(fullPlan, 3).map((s) => s.key),
    ['mon', 'tue', 'wed'],
  );
  assert.deepEqual(
    planToSections(fullPlan, 7).map((s) => s.key),
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  );
});

test('titles + weekend flags match the web WeeklyPlanGrid', () => {
  const s = planToSections(fullPlan, 7);
  assert.deepEqual(
    s.map((x) => x.title),
    ['第一天', '第二天', '第三天', '第四天', '第五天', '第六天', '第七天'],
  );
  assert.deepEqual(
    s.map((x) => x.isWeekend),
    [false, false, false, false, false, true, true],
  );
});

test('missing day key -> empty data array (never crashes)', () => {
  const sparse: WeeklyPlan = { mon: [r('a')] };
  const s = planToSections(sparse, 5);
  assert.equal(s.length, 5);
  assert.deepEqual(s[0].data.map((x) => x.id), ['a']);
  assert.deepEqual(s[1].data, []);
});

test('null / undefined slot entries are dropped', () => {
  const dirty = { mon: [r('a'), null, undefined, r('b')] } as unknown as WeeklyPlan;
  assert.deepEqual(planToSections(dirty, 1)[0].data.map((x) => x.id), ['a', 'b']);
});

test('daysPerWeek is clamped to [0, 7]', () => {
  assert.equal(planToSections(fullPlan, 0).length, 0);
  assert.equal(planToSections(fullPlan, 99).length, 7);
  assert.equal(planToSections(fullPlan, -3).length, 0);
});

test('planHasRecipes: true only when some day has a recipe', () => {
  assert.equal(planHasRecipes(fullPlan), true);
  assert.equal(planHasRecipes({ mon: [], tue: [], wed: [] }), false);
  assert.equal(planHasRecipes({ mon: [null] as unknown as GenerateRecipe[] }), false);
  assert.equal(planHasRecipes({}), false);
});
