import { describe, expect, it } from 'vitest';

import { formatAmountText } from '../src/lib/quantityFormatter';
import { formatQuantityDisplay } from '../src/features/shopping-list/types';

describe('spoon amounts read in the spoon a cook reaches for', () => {
  it.each([
    [0.125, 'tsp', '茶匙', '1/8 茶匙'],
    [1.5, 'tsp', '茶匙', '1 1/2 茶匙'],
    [2.5, 'tsp', '茶匙', '2 1/2 茶匙'],
    [3, 'tsp', '茶匙', '1 湯匙'],
    [8, 'tsp', '茶匙', '2 2/3 湯匙'],
    [1.5, 'tbsp', '湯匙', '1 1/2 湯匙'],
    [0.5, 'tbsp', '湯匙', '1 1/2 茶匙'],
    [2, 'tbsp', '湯匙', '2 湯匙'],
  ])('%s %s → %s', (quantity, unit, label, expected) => {
    expect(formatAmountText(quantity, unit, label)).toBe(expected);
  });

  it('shows amounts under 1/8 茶匙 as 少許 without a unit', () => {
    expect(formatAmountText(0.04, 'tsp', '茶匙')).toBe('少許');
    expect(formatAmountText(0.04, 'tsp', 'tsp')).toBe('a pinch');
  });

  it('rounds an uneven spoon total to an easy measure and marks it approximate', () => {
    expect(formatAmountText(8.4, 'tsp', '茶匙')).toBe('約2 3/4 湯匙');
    expect(formatAmountText(1.3, 'tsp', '茶匙')).toBe('約1 1/4 茶匙');
  });

  it('never shows 3/8, 5/8 or 7/8 茶匙', () => {
    expect(formatAmountText(0.625, 'tsp', '茶匙')).toBe('約3/4 茶匙');
    expect(formatAmountText(0.375, 'tsp', '茶匙')).toBe('約1/2 茶匙');
    expect(formatAmountText(0.875, 'tsp', '茶匙')).toBe('約1 茶匙');
    expect(formatAmountText(1.625, 'tsp', '茶匙')).toBe('約1 3/4 茶匙');
    expect(formatAmountText(0.15, 'tsp', '茶匙')).toBe('約1/8 茶匙');
    expect(formatAmountText(2.9, 'tsp', '茶匙')).toBe('約1 湯匙');
  });

  it('keeps an even 茶匙 amount when it would be an odd 湯匙 fraction', () => {
    expect(formatAmountText(3.5, 'tsp', '茶匙')).toBe('3 1/2 茶匙');
    expect(formatAmountText(4, 'tsp', '茶匙')).toBe('1 1/3 湯匙');
    expect(formatAmountText(5, 'tsp', '茶匙')).toBe('1 2/3 湯匙');
  });

  it('uses English labels when the list is in English', () => {
    expect(formatAmountText(6, 'tsp', 'tsp')).toBe('2 tbsp');
  });

  it('leaves other units as before', () => {
    expect(formatAmountText(340, 'g', '克')).toBe('340 克');
    expect(formatAmountText(0.5, 'clove', '瓣', { roundCount: false })).toBe('1/2 瓣');
  });

  it('is what the shopping list shows for a merged spoon total', () => {
    expect(formatQuantityDisplay(9, '茶匙', false)).toBe('3 湯匙');
    expect(formatQuantityDisplay(0.05, '茶匙', false)).toBe('少許');
    expect(formatQuantityDisplay(null, '茶匙', true)).toBe('（數量待補）');
  });
});
