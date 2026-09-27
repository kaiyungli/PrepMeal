import { describe, expect, it } from 'vitest';
import { getEffectiveFlavor, recipeMatchesFilters } from '@/constants/filters';

const recipe = {
  cuisine: 'chinese',
  dish_type: 'main',
  protein: [],
  primary_protein: 'egg',
  method: 'stir_fry',
  speed: 'quick',
  difficulty: 'easy',
  diet: ['vegetarian', 'egg_lacto'],
  flavor: ['鹹', 'tangy'],
};

describe('generation recipe filters', () => {
  it('normalizes stored Chinese and legacy flavor values through the taxonomy', () => {
    expect(getEffectiveFlavor(recipe)).toEqual(['salty', 'sour']);
    expect(getEffectiveFlavor({ flavor: 'savory, 辣, savory' })).toEqual(['salty', 'spicy']);
  });

  it('matches any selected value within each group', () => {
    expect(recipeMatchesFilters(recipe, {
      cuisine: ['japanese', 'chinese'],
      protein: ['fish', 'egg'],
      diet: ['low_fat', 'vegetarian'],
      flavor: ['spicy', 'salty'],
    })).toBe(true);
  });

  it('requires every active group to match and rejects an unmatched flavor', () => {
    expect(recipeMatchesFilters(recipe, { cuisine: ['chinese'], flavor: ['sweet'] })).toBe(false);
    expect(recipeMatchesFilters(recipe, { cuisine: ['japanese'], flavor: ['salty'] })).toBe(false);
  });

  it('handles the other single-value groups and empty selections', () => {
    expect(recipeMatchesFilters(recipe, {
      dish_type: ['main'], method: ['stir_fry'], speed: ['quick'], difficulty: ['easy'], diet: [],
    })).toBe(true);
    expect(recipeMatchesFilters(recipe, { method: ['boil'] })).toBe(false);
  });

  it('does not match missing diet or flavor data against selected values', () => {
    expect(recipeMatchesFilters({ ...recipe, diet: null, flavor: null }, { diet: ['vegetarian'] })).toBe(false);
    expect(recipeMatchesFilters({ ...recipe, diet: null, flavor: null }, { flavor: ['salty'] })).toBe(false);
  });
});
