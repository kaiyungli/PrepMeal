import { describe, expect, it } from 'vitest';
import { METHODS } from '../recipeContract';
import { METHOD_MAP, METHOD_OPTIONS } from '../taxonomy';

describe('cold preparation method contract', () => {
  it('offers no_cook in canonical admin validation and UI filter choices', () => {
    expect(METHODS).toContain('no_cook');
    expect(METHOD_OPTIONS).toContainEqual({ value: 'no_cook', label: '冷拌' });
    expect(METHOD_MAP.no_cook).toBe('冷拌');
  });
  it('keeps all older canonical methods available', () => {
    for (const method of ['stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked']) {
      expect(METHODS).toContain(method);
      expect(METHOD_OPTIONS.some(option => option.value === method)).toBe(true);
    }
  });
});
