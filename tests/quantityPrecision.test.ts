import { describe, expect, it } from 'vitest';
import { formatQuantityForDisplay } from '@/lib/quantityFormatter';

it.each([[0.125, 'pc', '1/8'], [0.25, 'pc', '1/4'], [0.5, 'egg', '1/2'], [1.5, 'clove', '1 1/2'], [0.13, 'stick', '0.13']])('retains recipe count %s %s', (quantity, unit, expected) => {
  expect(formatQuantityForDisplay(quantity as number, unit as string, { roundCount: false })).toBe(expected);
  expect(formatQuantityForDisplay(quantity as number, unit as string)).toBe(String(Math.ceil(quantity as number)));
});
import { formatQuantityDisplay } from '@/features/shopping-list/types';

describe('measured ingredient amounts retain their actual quantity', () => {
  it.each([
    [166.666667, 'g', '約166.7'], [0.666667, '克', '約0.67'],
    [33.333333, 'ml', '約33.3'], [0.033333, 'g', '約0.033'],
    [0.00001, 'g', '0.00001'], [0.15, 'g', '0.15'],
    [0.333333, 'tsp', '1/3'], [0.666667, 'pc', '2/3'],
  ])('shows readable one-person amount %s %s without altering its input', (quantity, unit, expected) => {
    expect(formatQuantityForDisplay(quantity as number, unit as string, { roundCount: false })).toBe(expected);
  });
  it.each(['cup', 'cups', '杯'])('keeps a quarter %s instead of rounding it to a full cup', unit => {
    expect(formatQuantityForDisplay(0.25, unit)).toBe('1/4');
  });
  it.each(['tsp', 'tbsp', '茶匙', '湯匙', 'teaspoon', 'tablespoon'])('does not inflate a small %s amount', unit => {
    expect(formatQuantityForDisplay(0.1, unit)).toBe('0.1');
    expect(formatQuantityForDisplay(0.13, unit)).toBe('0.13');
  });
  it('shows exact familiar fractions without replacing a distinct decimal value', () => {
    expect(formatQuantityForDisplay(1 / 3, 'tsp')).toBe('1/3');
    expect(formatQuantityForDisplay(0.33, 'tsp')).toBe('0.33');
    expect(formatQuantityForDisplay(0.3, '杯')).toBe('0.3');
  });
  it('preserves the same measurement in the shopping-list presentation', () => {
    expect(formatQuantityDisplay(0.25, '杯', false)).toBe('1/4 杯');
    expect(formatQuantityDisplay(0.1, '茶匙', false)).toBe('0.1 茶匙');
  });
});
