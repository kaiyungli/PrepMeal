import { expect, it } from 'vitest';
import { sameGrocery } from '@/features/shopping-list/recipeQuantities';
const row = (ingredientId: string | null, unit: string, name = '蒜頭') => ({ ingredientId, unit, name, quantityText: '', quantityPending: false });
it('matches fixed-ratio units but keeps density and count conversions separate', () => {
  expect(sameGrocery(row('a', 'g'), row('a', 'kg'))).toBe(true);
  expect(sameGrocery(row('a', 'tbsp'), row('a', 'tsp'))).toBe(true);
  expect(sameGrocery(row('a', 'g'), row('a', 'clove'))).toBe(false);
  expect(sameGrocery(row('a', 'g'), row('b', 'g'))).toBe(false);
  expect(sameGrocery(row(null, 'g'), row('a', 'g'))).toBe(false);
  expect(sameGrocery(row(null, 'g'), row(null, 'g'))).toBe(true);
});

it('matches Chinese API display units to canonical master units', () => {
  for (const [code, display] of [['g','克'], ['kg','公斤'], ['ml','毫升'], ['l','公升'], ['tsp','茶匙'], ['tbsp','湯匙'], ['pc','件']]) expect(sameGrocery(row('a', code), row('a', display))).toBe(true);
});
