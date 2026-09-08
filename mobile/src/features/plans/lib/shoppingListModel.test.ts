/**
 * Unit tests for the ported shopping-list normalization + grouping.
 * Run with: `npm test`.
 *
 * These lock the mobile output to the web rules they were ported from
 * (`src/features/shopping-list/*`, `src/lib/quantityFormatter.ts`,
 * `src/pages/api/shopping-list.ts`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  groupPlanShoppingList,
  formatQuantityDisplay,
  formatQuantityForDisplay,
  mapRawCategoryToKey,
  normalizeUnitCode,
  SHOPPING_CATEGORY_ORDER,
  type RawShoppingListRow,
} from './shoppingListModel.ts';

// ---------------------------------------------------------------------------
// mapRawCategoryToKey
// ---------------------------------------------------------------------------

test('mapRawCategoryToKey: canonical keys pass straight through', () => {
  for (const key of SHOPPING_CATEGORY_ORDER) {
    assert.equal(mapRawCategoryToKey(key), key);
  }
});

test('mapRawCategoryToKey: English aliases map to their canonical key', () => {
  assert.equal(mapRawCategoryToKey('beef'), 'meat');
  assert.equal(mapRawCategoryToKey('pork'), 'meat');
  assert.equal(mapRawCategoryToKey('prawn'), 'seafood');
  assert.equal(mapRawCategoryToKey('eggs'), 'tofu_egg');
  assert.equal(mapRawCategoryToKey('produce'), 'vegetable');
  assert.equal(mapRawCategoryToKey('noodles'), 'carb');
  assert.equal(mapRawCategoryToKey('sauce'), 'seasoning');
  assert.equal(mapRawCategoryToKey('butter'), 'dairy');
});

test('mapRawCategoryToKey: case and surrounding whitespace are ignored', () => {
  assert.equal(mapRawCategoryToKey('  BEEF  '), 'meat');
  assert.equal(mapRawCategoryToKey('Vegetable'), 'vegetable');
});

test('mapRawCategoryToKey: null / empty / unknown fall back to other', () => {
  assert.equal(mapRawCategoryToKey(null), 'other');
  assert.equal(mapRawCategoryToKey(undefined), 'other');
  assert.equal(mapRawCategoryToKey(''), 'other');
  assert.equal(mapRawCategoryToKey('unrecognised-thing'), 'other');
});

// ---------------------------------------------------------------------------
// normalizeUnitCode  (the src/pages/api/shopping-list.ts map)
// ---------------------------------------------------------------------------

test('normalizeUnitCode: known raw codes normalise, unknown pass through, empty -> ""', () => {
  assert.equal(normalizeUnitCode('teaspoon'), 'tsp');
  assert.equal(normalizeUnitCode('tablespoon'), 'tbsp');
  assert.equal(normalizeUnitCode('gram'), 'g');
  assert.equal(normalizeUnitCode('piece'), '件');
  assert.equal(normalizeUnitCode('bunch'), 'bunch');
  assert.equal(normalizeUnitCode(''), '');
  assert.equal(normalizeUnitCode(null), '');
});

// ---------------------------------------------------------------------------
// formatQuantityForDisplay  (verbatim from src/lib/quantityFormatter.ts)
// ---------------------------------------------------------------------------

test('formatQuantityForDisplay: mass / volume round up to an integer', () => {
  assert.equal(formatQuantityForDisplay(120.3, 'g'), '121');
  assert.equal(formatQuantityForDisplay(0.4, 'kg'), '1');
  assert.equal(formatQuantityForDisplay(250.01, 'ml'), '251');
});

test('formatQuantityForDisplay: count units (incl. aliased "隻") round up', () => {
  assert.equal(formatQuantityForDisplay(2, 'clove'), '2');
  assert.equal(formatQuantityForDisplay(5.2, '隻'), '6');
});

test('formatQuantityForDisplay: tbsp/tsp prefer a fraction label', () => {
  assert.equal(formatQuantityForDisplay(0.5, 'tbsp'), '1/2');
  assert.equal(formatQuantityForDisplay(0.25, 'tsp'), '1/4');
  assert.equal(formatQuantityForDisplay(1.5, 'tbsp'), '1 1/2');
});

test('formatQuantityForDisplay: no quantity or no unit -> ""', () => {
  assert.equal(formatQuantityForDisplay(0, 'g'), '');
  assert.equal(formatQuantityForDisplay(5, ''), '');
  assert.equal(formatQuantityForDisplay(5, null), '');
});

// ---------------------------------------------------------------------------
// formatQuantityDisplay  (verbatim from src/features/shopping-list/types)
// ---------------------------------------------------------------------------

test('formatQuantityDisplay: pending / null / zero render as documented', () => {
  assert.equal(formatQuantityDisplay(3, 'g', true), '（數量待補）');
  assert.equal(formatQuantityDisplay(null, 'g', false), '');
  assert.equal(formatQuantityDisplay(0, 'g', false), '');
});

test('formatQuantityDisplay: value + unit -> "<qty> <unit>", value only -> "<qty>"', () => {
  assert.equal(formatQuantityDisplay(6, '隻', false), '6 隻');
  assert.equal(formatQuantityDisplay(120.3, 'g', false), '121 g');
  assert.equal(formatQuantityDisplay(5, '', false), '');
});

// ---------------------------------------------------------------------------
// groupPlanShoppingList
// ---------------------------------------------------------------------------

function row(partial: Partial<RawShoppingListRow>): RawShoppingListRow {
  return {
    ingredient_id: 'ing-x',
    name: 'X',
    shopping_category: 'other',
    quantity: 1,
    unit_code: null,
    unit_display: null,
    ...partial,
  };
}

test('groupPlanShoppingList: null / empty input -> []', () => {
  assert.deepEqual(groupPlanShoppingList(null), []);
  assert.deepEqual(groupPlanShoppingList(undefined), []);
  assert.deepEqual(groupPlanShoppingList([]), []);
});

test('groupPlanShoppingList: sections come out in SHOPPING_CATEGORY_ORDER', () => {
  const out = groupPlanShoppingList([
    row({ ingredient_id: 'a', name: '鹽', shopping_category: 'seasoning' }),
    row({ ingredient_id: 'b', name: '雞髀', shopping_category: 'meat' }),
    row({ ingredient_id: 'c', name: '菜心', shopping_category: 'vegetable' }),
  ]);
  assert.deepEqual(
    out.map((s) => s.key),
    ['meat', 'vegetable', 'seasoning'],
  );
  assert.equal(out[0].label, '肉類');
  assert.equal(out[0].icon, '🥩');
});

test('groupPlanShoppingList: quantity text uses unit_display, else the normalised code', () => {
  const out = groupPlanShoppingList([
    row({
      ingredient_id: 'egg',
      name: '雞蛋',
      shopping_category: 'tofu_egg',
      quantity: 5.2,
      unit_code: 'piece',
      unit_display: '隻',
    }),
    row({
      ingredient_id: 'flour',
      name: '麵粉',
      shopping_category: 'carb',
      quantity: 120.3,
      unit_code: 'gram',
      unit_display: null,
    }),
    row({
      ingredient_id: 'water',
      name: '水',
      shopping_category: 'other',
      quantity: 100,
      unit_code: null,
      unit_display: '  ',
    }),
  ]);
  const flat = out.flatMap((s) => s.items);
  assert.deepEqual(
    flat.find((i) => i.name === '雞蛋'),
    { ingredientId: 'egg', name: '雞蛋', quantityText: '6 隻' },
  );
  assert.equal(
    flat.find((i) => i.name === '麵粉')?.quantityText,
    '121 g',
  );
  // blank unit_display + null code -> no unit -> quantity text collapses to ''
  assert.equal(flat.find((i) => i.name === '水')?.quantityText, '');
});

test('groupPlanShoppingList: unknown category -> "其他"; null quantity -> ""; blank name skipped', () => {
  const out = groupPlanShoppingList([
    row({ ingredient_id: 'a', name: '神秘物', shopping_category: 'wat' }),
    row({ ingredient_id: 'b', name: '豉油', shopping_category: 'seasoning', quantity: null }),
    row({ ingredient_id: 'c', name: '   ', shopping_category: 'meat' }),
  ]);
  assert.deepEqual(
    out.map((s) => s.key),
    ['seasoning', 'other'],
  );
  assert.equal(out.find((s) => s.key === 'other')?.label, '其他');
  assert.equal(
    out.find((s) => s.key === 'seasoning')?.items[0].quantityText,
    '',
  );
  // the blank-name meat row was dropped, so no meat section exists
  assert.equal(
    out.some((s) => s.key === 'meat'),
    false,
  );
});

test('groupPlanShoppingList: a null ingredient_id still produces a stable, unique row key', () => {
  const out = groupPlanShoppingList([
    row({ ingredient_id: null, name: '蔥', shopping_category: 'vegetable' }),
    row({ ingredient_id: null, name: '薑', shopping_category: 'vegetable' }),
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual(
    out[0].items.map((i) => i.name),
    ['蔥', '薑'],
  );
  assert.deepEqual(
    out[0].items.map((i) => i.ingredientId),
    [null, null],
  );
});
