/**
 * Unit tests for the plan-items grouping mapper.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { mapPlanItemsByDay } from './mapPlanItemsByDay.ts';

function item(overrides) {
  return {
    id: 'i',
    date: null,
    meal_slot: null,
    servings: null,
    item_order: null,
    recipe_id: null,
    recipe: null,
    ...overrides,
  };
}

test('empty / non-array input returns []', () => {
  assert.deepEqual(mapPlanItemsByDay([]), []);
  assert.deepEqual(mapPlanItemsByDay(null), []);
  assert.deepEqual(mapPlanItemsByDay(undefined), []);
});

test('day buckets are ordered by date ascending regardless of input order', () => {
  const days = mapPlanItemsByDay([
    item({ id: 'c', date: '2026-09-03' }),
    item({ id: 'a', date: '2026-09-01' }),
    item({ id: 'b', date: '2026-09-02' }),
  ]);
  assert.deepEqual(
    days.map((d) => d.date),
    ['2026-09-01', '2026-09-02', '2026-09-03'],
  );
  assert.deepEqual(
    days.map((d) => d.items.map((i) => i.id)),
    [['a'], ['b'], ['c']],
  );
});

test('within a day: meal slot (breakfast->lunch->dinner->other), then item_order', () => {
  const [day] = mapPlanItemsByDay([
    item({ id: 'dinner-2', date: '2026-09-01', meal_slot: 'dinner', item_order: 2 }),
    item({ id: 'dinner-1', date: '2026-09-01', meal_slot: 'dinner', item_order: 1 }),
    item({ id: 'breakfast', date: '2026-09-01', meal_slot: 'breakfast', item_order: 1 }),
    item({ id: 'lunch', date: '2026-09-01', meal_slot: 'lunch', item_order: 1 }),
    item({ id: 'snack', date: '2026-09-01', meal_slot: 'snack', item_order: 1 }),
  ]);
  assert.deepEqual(
    day.items.map((i) => i.id),
    ['breakfast', 'lunch', 'dinner-1', 'dinner-2', 'snack'],
  );
});

test('missing meal_slot / item_order are tolerated and sort deterministically', () => {
  const [day] = mapPlanItemsByDay([
    item({ id: 'x', date: '2026-09-01' }),
    item({ id: 'y', date: '2026-09-01', meal_slot: 'breakfast' }),
    item({ id: 'z', date: '2026-09-01' }),
  ]);
  // 'y' (breakfast) leads; the two slot-less rows keep input order (stable).
  assert.deepEqual(
    day.items.map((i) => i.id),
    ['y', 'x', 'z'],
  );
});

test('items with a blank / missing date collect into a trailing null bucket', () => {
  const days = mapPlanItemsByDay([
    item({ id: 'nodate', date: '  ' }),
    item({ id: 'dated', date: '2026-09-01' }),
    item({ id: 'nulldate', date: null }),
  ]);
  assert.deepEqual(
    days.map((d) => d.date),
    ['2026-09-01', null],
  );
  assert.deepEqual(days[1].items.map((i) => i.id), ['nodate', 'nulldate']);
});

test('equal (slot, order) rows keep original input order', () => {
  const [day] = mapPlanItemsByDay([
    item({ id: 'first', date: '2026-09-01', meal_slot: 'dinner', item_order: 1 }),
    item({ id: 'second', date: '2026-09-01', meal_slot: 'dinner', item_order: 1 }),
    item({ id: 'third', date: '2026-09-01', meal_slot: 'dinner', item_order: 1 }),
  ]);
  assert.deepEqual(
    day.items.map((i) => i.id),
    ['first', 'second', 'third'],
  );
});

test('does not mutate or reorder the input array', () => {
  const input = [
    item({ id: 'b', date: '2026-09-02' }),
    item({ id: 'a', date: '2026-09-01' }),
  ];
  const snapshot = input.map((i) => i.id);
  mapPlanItemsByDay(input);
  assert.deepEqual(
    input.map((i) => i.id),
    snapshot,
  );
});
