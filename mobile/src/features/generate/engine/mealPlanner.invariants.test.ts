/**
 * Planner invariants — asserted on every iteration with REAL randomness.
 *
 * These mirror the web suites `tests/qa-planner.test.ts` and
 * `tests/mealPlanner.advanced.test.ts`: properties that must hold for ANY random
 * draw, so they catch a divergence the fixed-seed vectors (which pin one draw)
 * would miss.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { planWeekAdvanced, matchesSlotRole } from './mealPlanner.ts';
import { normalizeIngredients } from './ingredientNormalizer.ts';
import { COMPOSITION_CONFIG } from './constants/composition.ts';
import { isWeekendKey } from './__fixtures__/vectorConfig.ts';

const FIX = path.join(import.meta.dirname, '__fixtures__');
type Row = Record<string, unknown>;
const pool: Row[] = JSON.parse(readFileSync(path.join(FIX, 'recipes.pool.json'), 'utf8'));
const qa: Row[] = JSON.parse(readFileSync(path.join(FIX, 'recipes.qa.json'), 'utf8'));

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const ITER = 200;

function baseConfig(comp: keyof typeof COMPOSITION_CONFIG, over: Record<string, unknown> = {}) {
  const cc = COMPOSITION_CONFIG[comp];
  return {
    daysPerWeek: 7,
    dishesPerDay: cc.dishesPerDay,
    slotRoles: cc.slotRoles,
    dailyComposition: comp,
    allowCompleteMeal: true,
    isWeekend: isWeekendKey,
    cuisines: [],
    exclusions: [],
    cookingConstraints: [],
    budget: 'medium',
    pantryIngredients: [],
    lockedSlots: {},
    lockedRecipes: {},
    ...over,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (recipes: Row[], config: Record<string, unknown>) => planWeekAdvanced(recipes as any, config as any);

function isComplete(r: Row): boolean {
  return r.is_complete_meal === true || r.meal_role === 'complete_meal';
}

test('day count + day keys match daysPerWeek', () => {
  for (const days of [3, 5, 7]) {
    for (let i = 0; i < ITER; i++) {
      const plan = run(pool, baseConfig('meat_veg', { daysPerWeek: days }));
      assert.deepStrictEqual(Object.keys(plan), DAY_KEYS.slice(0, days));
    }
  }
});

test('slots per day never exceed dishesPerDay; full when pool is sufficient', () => {
  for (const comp of ['complete_meal', 'meat_veg', 'two_meat_one_veg'] as const) {
    const cc = COMPOSITION_CONFIG[comp];
    for (let i = 0; i < ITER; i++) {
      const plan = run(pool, baseConfig(comp));
      for (const day of Object.values(plan)) {
        assert.ok(day.length <= cc.dishesPerDay, `${comp}: ${day.length} > ${cc.dishesPerDay}`);
        assert.equal(day.length, cc.dishesPerDay, `${comp}: pool of 60 should fill every slot`);
      }
    }
  }
});

test('no duplicate recipe id within a plan (pool + qa, all modes)', () => {
  for (const recipes of [pool, qa]) {
    for (const comp of ['complete_meal', 'meat_veg', 'two_meat_one_veg'] as const) {
      for (let i = 0; i < ITER; i++) {
        const plan = run(recipes, baseConfig(comp));
        const ids = Object.values(plan).flat().map((r) => r.id);
        assert.equal(new Set(ids).size, ids.length, `${comp}: duplicate id in plan`);
      }
    }
  }
});

test('slot-role correctness per composition (pool)', () => {
  const checks: Record<string, (r: Row) => boolean> = {
    protein_main: (r) => matchesSlotRole(r, 'protein_main'),
    // veg_side slot: never carries a primary_protein when protein-free sides exist
    // (they always do in the 60-row pool).
    veg_side: (r) => !r.primary_protein,
  };
  for (const comp of ['meat_veg', 'two_meat_one_veg'] as const) {
    const roles = COMPOSITION_CONFIG[comp].slotRoles;
    for (let i = 0; i < ITER; i++) {
      const plan = run(pool, baseConfig(comp));
      for (const day of Object.values(plan)) {
        day.forEach((recipe, idx) => {
          const role = roles[idx];
          assert.ok(checks[role](recipe), `${comp} slot ${idx} (${role}) got wrong recipe: ${JSON.stringify(recipe.id)}`);
        });
      }
    }
  }
});

test('at most one complete_meal per day', () => {
  for (const comp of ['meat_veg', 'two_meat_one_veg'] as const) {
    for (let i = 0; i < ITER; i++) {
      const plan = run(pool, baseConfig(comp));
      for (const day of Object.values(plan)) {
        assert.ok(day.filter(isComplete).length <= 1, `${comp}: >1 complete_meal in a day`);
      }
    }
  }
});

test('allowCompleteMeal=false removes every complete_meal (mixed modes)', () => {
  for (const comp of ['meat_veg', 'two_meat_one_veg'] as const) {
    for (const recipes of [pool, qa]) {
      for (let i = 0; i < ITER; i++) {
        const plan = run(recipes, baseConfig(comp, { allowCompleteMeal: false }));
        for (const r of Object.values(plan).flat()) {
          assert.equal(isComplete(r), false, `${comp}: complete_meal leaked with allowCompleteMeal=false`);
        }
      }
    }
  }
});

test('exclusions drop recipes by normalised protein', () => {
  const excl = ['beef', 'shrimp'];
  const normExcl = normalizeIngredients(excl);
  for (let i = 0; i < ITER; i++) {
    const plan = run(pool, baseConfig('meat_veg', { exclusions: excl }));
    for (const r of Object.values(plan).flat()) {
      const proteins = normalizeIngredients(
        [r.primary_protein, ...((r.protein as string[]) ?? [])].filter(Boolean) as string[],
      );
      for (const p of proteins) {
        assert.ok(!normExcl.includes(p), `excluded protein ${p} present on ${String(r.id)}`);
      }
    }
  }
  // qa fixture: '牛' normalises to 'beef' and must be excluded too.
  for (let i = 0; i < ITER; i++) {
    const plan = run(qa, baseConfig('meat_veg', { exclusions: ['beef'] }));
    for (const r of Object.values(plan).flat()) {
      assert.notEqual(normalizeIngredients([r.primary_protein].filter(Boolean) as string[])[0], 'beef');
    }
  }
});

test('complete_meal mode: fallback chain fills from non-complete recipes, honestly under-fills when exhausted', () => {
  // 7 recipes (3 complete + 4 protein_main) for 7 one-dish days -> every day filled
  // via the complete_meal -> main -> any fallback chain, no repeats.
  const seven = qa.slice(0, 7);
  for (let i = 0; i < ITER; i++) {
    const plan = run(seven, baseConfig('complete_meal'));
    assert.equal(Object.keys(plan).length, 7);
    for (const day of Object.values(plan)) {
      assert.equal(day.length, 1, 'a 7-recipe pool should fill all 7 one-dish days');
    }
    const ids = Object.values(plan).flat().map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  }
  // 5 recipes for 7 slots -> the planner never repeats and never throws: exactly
  // 5 days filled, 2 empty. (This is the real "insufficient pool" behaviour the
  // preview UI surfaces as an under-filled plan.)
  const five = qa.slice(0, 5);
  for (let i = 0; i < ITER; i++) {
    const plan = run(five, baseConfig('complete_meal'));
    const filled = Object.values(plan).filter((d) => d.length === 1).length;
    const empty = Object.values(plan).filter((d) => d.length === 0).length;
    assert.equal(filled, 5);
    assert.equal(empty, 2);
    const ids = Object.values(plan).flat().map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});
