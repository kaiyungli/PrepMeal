/**
 * Unit tests for the plan-detail row / item normalizers.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { mapPlanDetailRow, mapPlanItemRow } from './mapPlanItem.ts';

test('mapPlanDetailRow maps scalars and stringifies a numeric id', () => {
  assert.deepEqual(
    mapPlanDetailRow({
      id: 42,
      title: '週末餐單',
      start_date: '2026-09-01',
      end_date: '2026-09-07',
      avg_servings: 4,
      item_count: 12,
    }),
    {
      id: '42',
      title: '週末餐單',
      start_date: '2026-09-01',
      end_date: '2026-09-07',
      avg_servings: 4,
      item_count: 12,
    },
  );
});

test('mapPlanDetailRow: blank title → fallback, bad numerics → null, item_count → 0', () => {
  const plan = mapPlanDetailRow({
    id: 'p1',
    title: '   ',
    start_date: 0,
    end_date: undefined,
    avg_servings: Number.NaN,
    item_count: 'nope',
  });
  assert.equal(plan.title, '未命名餐單');
  assert.equal(plan.start_date, null);
  assert.equal(plan.end_date, null);
  assert.equal(plan.avg_servings, null);
  assert.equal(plan.item_count, 0);
});

test('mapPlanItemRow maps item scalars and an object recipe embed', () => {
  assert.deepEqual(
    mapPlanItemRow({
      id: 7,
      date: '2026-09-01',
      meal_slot: 'dinner',
      servings: 2,
      item_order: 3,
      recipe_id: 900,
      recipes: {
        id: 'r1',
        slug: 'kung-pao',
        name: '宮保雞丁',
        image_url: 'https://img/r1.jpg',
      },
    }),
    {
      id: '7',
      date: '2026-09-01',
      meal_slot: 'dinner',
      servings: 2,
      item_order: 3,
      recipe_id: '900',
      recipe: {
        id: 'r1',
        slug: 'kung-pao',
        name: '宮保雞丁',
        image_url: 'https://img/r1.jpg',
      },
    },
  );
});

test('embedded recipe: a one-element array embed is unwrapped', () => {
  const { recipe } = mapPlanItemRow({
    id: '1',
    recipes: [{ id: 'r1', slug: null, name: '沙拉', image_url: null }],
  });
  assert.deepEqual(recipe, {
    id: 'r1',
    slug: null,
    name: '沙拉',
    image_url: null,
  });
});

test('embedded recipe: null / empty array / empty object / absent → recipe null', () => {
  assert.equal(mapPlanItemRow({ id: '1', recipes: null }).recipe, null);
  assert.equal(mapPlanItemRow({ id: '1', recipes: [] }).recipe, null);
  assert.equal(mapPlanItemRow({ id: '1', recipes: {} }).recipe, null);
  assert.equal(mapPlanItemRow({ id: '1' }).recipe, null);
});

test('embedded recipe: missing / blank id → recipe null (row stays non-navigable)', () => {
  assert.equal(
    mapPlanItemRow({ id: '1', recipes: { slug: 's', name: '有名' } }).recipe,
    null,
  );
  assert.equal(
    mapPlanItemRow({ id: '1', recipes: { id: '   ', name: '有名' } }).recipe,
    null,
  );
});

test('embedded recipe: blank name falls back but the recipe still resolves', () => {
  const { recipe } = mapPlanItemRow({
    id: '1',
    recipes: { id: 'r1', name: '   ' },
  });
  assert.deepEqual(recipe, {
    id: 'r1',
    slug: null,
    name: '未知食譜',
    image_url: null,
  });
});

test('mapPlanItemRow: recipe_id normalization', () => {
  assert.equal(mapPlanItemRow({ id: '1' }).recipe_id, null);
  assert.equal(mapPlanItemRow({ id: '1', recipe_id: null }).recipe_id, null);
  assert.equal(mapPlanItemRow({ id: '1', recipe_id: 900 }).recipe_id, '900');
  assert.equal(mapPlanItemRow({ id: '1', recipe_id: 'abc' }).recipe_id, 'abc');
});

test('mapPlanItemRow: bad scalars degrade to null without throwing', () => {
  const row = mapPlanItemRow({
    id: 5,
    date: '  ',
    meal_slot: 0,
    servings: 'x',
    item_order: Number.POSITIVE_INFINITY,
  });
  assert.equal(row.id, '5');
  assert.equal(row.date, null);
  assert.equal(row.meal_slot, null);
  assert.equal(row.servings, null);
  assert.equal(row.item_order, null);
  assert.equal(row.recipe, null);
});
