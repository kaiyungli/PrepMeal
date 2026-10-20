import { describe, expect, it } from 'vitest';
import { formatQuantityForDisplay } from '@/lib/quantityFormatter';
import { formatQuantityDisplay } from '@/features/shopping-list/types';

describe('measured ingredient amounts retain their actual quantity', () => {
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
