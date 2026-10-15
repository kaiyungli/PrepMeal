import { describe, expect, it } from 'vitest';
import { METHODS } from '../src/constants/recipeContract';
import { METHOD_MAP, METHOD_OPTIONS } from '../src/constants/taxonomy';
import { buildRecipeAtomicParams } from '../src/lib/adminRecipeAtomicParams';

const baseBody = {
  name: '冷拌驗證用測試',
  slug: 'no-cook-method-contract-test',
  cuisine: 'thai',
  dish_type: 'side',
  difficulty: 'easy',
  method: 'no_cook',
};

describe('cold preparation method contract', () => {
  it('exposes no_cook in the canonical contract and recipe filter', () => {
    expect(METHODS).toContain('no_cook');
    expect(METHOD_OPTIONS).toContainEqual({ value: 'no_cook', label: '冷拌' });
    expect(METHOD_MAP.no_cook).toBe('冷拌');
  });

  it('accepts no_cook at the admin atomic RPC request boundary', () => {
    const result = buildRecipeAtomicParams(baseBody);
    expect(result).toHaveProperty('params.p_method', 'no_cook');
    expect(result).not.toHaveProperty('error');
  });

  it.each(['stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked'])(
    'keeps pre-existing method %s valid across filter and request validation',
    (method) => {
      expect(METHODS).toContain(method);
      expect(METHOD_OPTIONS.some(option => option.value === method)).toBe(true);
      expect(buildRecipeAtomicParams({ ...baseBody, method })).toHaveProperty('params.p_method', method);
    },
  );

  it('rejects unknown method values before an RPC call', () => {
    expect(buildRecipeAtomicParams({ ...baseBody, method: 'not_a_method' })).toEqual({
      error: 'Invalid value for "method"',
    });
  });
});
