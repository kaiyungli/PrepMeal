/**
 * Unit tests for the Generate lean-fetch row mapper. No network / Supabase.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { mapGenerateRecipeRow, type RawGenerateRow } from './generateRecipeRow.ts';

function raw(over: Partial<RawGenerateRow> = {}): RawGenerateRow {
  return {
    id: 'r1',
    slug: 'chicken-rice',
    name: '海南雞飯',
    image_url: 'https://cdn/x.png',
    description: '家常做法',
    cuisine: 'chinese',
    dish_type: 'main',
    method: 'steamed',
    speed: 'normal',
    primary_protein: 'chicken',
    protein: ['chicken'],
    diet: ['high_protein'],
    flavor: 'salty',
    is_complete_meal: true,
    meal_role: 'complete_meal',
    total_time_minutes: 30,
    difficulty: 'easy',
    ...over,
  };
}

test('maps a fully-populated row 1:1', () => {
  assert.deepStrictEqual(mapGenerateRecipeRow(raw()), {
    id: 'r1',
    slug: 'chicken-rice',
    name: '海南雞飯',
    image_url: 'https://cdn/x.png',
    description: '家常做法',
    cuisine: 'chinese',
    dish_type: 'main',
    method: 'steamed',
    speed: 'normal',
    primary_protein: 'chicken',
    protein: ['chicken'],
    diet: ['high_protein'],
    flavor: 'salty',
    is_complete_meal: true,
    meal_role: 'complete_meal',
    total_time_minutes: 30,
    difficulty: 'easy',
  });
});

test('nullable string fields: null / empty / non-string -> null', () => {
  const r = mapGenerateRecipeRow(
    raw({
      slug: '',
      image_url: null,
      description: '   ',
      cuisine: undefined,
      dish_type: 42,
      method: null,
      speed: '',
      primary_protein: null,
      meal_role: null,
      difficulty: null,
    }),
  );
  assert.equal(r.slug, null);
  assert.equal(r.image_url, null);
  assert.equal(r.description, null);
  assert.equal(r.cuisine, null);
  assert.equal(r.dish_type, null);
  assert.equal(r.method, null);
  assert.equal(r.speed, null);
  assert.equal(r.primary_protein, null);
  assert.equal(r.meal_role, null);
  assert.equal(r.difficulty, null);
});

test('name falls back when missing, never fabricated otherwise', () => {
  assert.equal(mapGenerateRecipeRow(raw({ name: null })).name, '未命名食譜');
  assert.equal(mapGenerateRecipeRow(raw({ name: '  ' })).name, '未命名食譜');
  assert.equal(mapGenerateRecipeRow(raw({ name: '牛排' })).name, '牛排');
});

test('total_time_minutes: only finite numbers survive', () => {
  assert.equal(mapGenerateRecipeRow(raw({ total_time_minutes: null })).total_time_minutes, null);
  assert.equal(mapGenerateRecipeRow(raw({ total_time_minutes: '30' })).total_time_minutes, null);
  assert.equal(mapGenerateRecipeRow(raw({ total_time_minutes: Number.NaN })).total_time_minutes, null);
  assert.equal(mapGenerateRecipeRow(raw({ total_time_minutes: 0 })).total_time_minutes, 0);
});

test('protein / diet: coerced to string[], junk dropped, non-array -> []', () => {
  assert.deepStrictEqual(mapGenerateRecipeRow(raw({ protein: null })).protein, []);
  assert.deepStrictEqual(mapGenerateRecipeRow(raw({ protein: 'chicken' })).protein, []);
  assert.deepStrictEqual(
    mapGenerateRecipeRow(raw({ protein: ['chicken', '', 3, null, 'beef'] as unknown[] })).protein,
    ['chicken', 'beef'],
  );
  assert.deepStrictEqual(mapGenerateRecipeRow(raw({ diet: undefined })).diet, []);
});

test('flavor: string stays string, array stays array, empty -> null', () => {
  assert.equal(mapGenerateRecipeRow(raw({ flavor: 'spicy' })).flavor, 'spicy');
  assert.deepStrictEqual(
    mapGenerateRecipeRow(raw({ flavor: ['salty', '', 'sweet'] as unknown[] })).flavor,
    ['salty', 'sweet'],
  );
  assert.equal(mapGenerateRecipeRow(raw({ flavor: [] as unknown[] })).flavor, null);
  assert.equal(mapGenerateRecipeRow(raw({ flavor: null })).flavor, null);
  assert.equal(mapGenerateRecipeRow(raw({ flavor: '' })).flavor, null);
});

test('is_complete_meal: strictly boolean true, everything else false', () => {
  assert.equal(mapGenerateRecipeRow(raw({ is_complete_meal: true })).is_complete_meal, true);
  assert.equal(mapGenerateRecipeRow(raw({ is_complete_meal: 'true' })).is_complete_meal, false);
  assert.equal(mapGenerateRecipeRow(raw({ is_complete_meal: 1 })).is_complete_meal, false);
  assert.equal(mapGenerateRecipeRow(raw({ is_complete_meal: null })).is_complete_meal, false);
});

test('numeric id is preserved as-is', () => {
  assert.equal(mapGenerateRecipeRow(raw({ id: 99 })).id, 99);
});
