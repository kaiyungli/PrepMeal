/**
 * Unit tests for the plan-summary list-row normalizer.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { mapPlanSummaryRow } from './mapPlanSummary.ts';

test('maps a full row and coerces id to string', () => {
  const summary = mapPlanSummaryRow({
    id: 42,
    title: '一週晚餐',
    start_date: '2026-09-01',
    end_date: '2026-09-07',
    created_at: '2026-09-01T10:00:00Z',
    avg_servings: 3,
    item_count: 7,
    preview_items: [
      { meal_slot: 'dinner', recipe: { name: '粟米肉碎' } },
      { meal_slot: 'lunch', recipe_name: '蒸水蛋' },
    ],
  });
  assert.equal(summary.id, '42');
  assert.equal(summary.title, '一週晚餐');
  assert.equal(summary.start_date, '2026-09-01');
  assert.equal(summary.avg_servings, 3);
  assert.equal(summary.item_count, 7);
  assert.deepEqual(summary.preview_items, [
    { recipe_name: '粟米肉碎', meal_slot: 'dinner' },
    { recipe_name: '蒸水蛋', meal_slot: 'lunch' },
  ]);
});

test('missing title falls back; nullable fields stay null; item_count defaults to 0', () => {
  const summary = mapPlanSummaryRow({ id: 'p1' });
  assert.equal(summary.title, '未命名餐單');
  assert.equal(summary.start_date, null);
  assert.equal(summary.end_date, null);
  assert.equal(summary.created_at, null);
  assert.equal(summary.avg_servings, null);
  assert.equal(summary.item_count, 0);
  assert.deepEqual(summary.preview_items, []);
});

test('blank strings and non-finite numbers normalize to null', () => {
  const summary = mapPlanSummaryRow({
    id: 'p2',
    title: '   ',
    start_date: '',
    avg_servings: Number.NaN,
    item_count: 'nope',
  });
  assert.equal(summary.title, '未命名餐單');
  assert.equal(summary.start_date, null);
  assert.equal(summary.avg_servings, null);
  assert.equal(summary.item_count, 0);
});

test('non-array preview_items degrades to [] and a nameless entry falls back', () => {
  assert.deepEqual(
    mapPlanSummaryRow({ id: 'p3', preview_items: 'garbage' }).preview_items,
    [],
  );
  assert.deepEqual(
    mapPlanSummaryRow({
      id: 'p4',
      preview_items: [{ meal_slot: 'dinner' }, null, 5],
    }).preview_items,
    [{ recipe_name: '未知食譜', meal_slot: 'dinner' }],
  );
});
