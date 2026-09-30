// Canonical Filter Contract v1 regression coverage.
//
// Rule: within the same filter group, OR; across different groups, AND.
// The "主要蛋白" group matches primary_protein only - fish/seafood/shrimp
// are sibling values with no umbrella expansion. diet/flavor arrays match
// on ANY selected value (OR), never containment-of-all (AND).
//
// These assertions run against both recipeMatchesFilters (Generate/
// favorites) and filterHomeCatalog (Home) so the two in-memory engines
// stay in lockstep. The third engine, /api/recipes, is covered separately
// in tests/recipesFilterContractApi.test.ts via direct handler behavior,
// since its logic lives in a Supabase query builder rather than a pure
// (recipe, filters) => boolean predicate.
import { describe, expect, it } from 'vitest';
import { recipeMatchesFilters } from '@/constants/filters';
import { filterHomeCatalog, type HomeCatalogRecipe } from '@/features/home/filterHomeCatalog';

type Engine = { name: string; matches: (recipe: Record<string, unknown>, filters: Record<string, string[]>) => boolean };

const engines: Engine[] = [
  { name: 'recipeMatchesFilters', matches: (recipe, filters) => recipeMatchesFilters(recipe, filters) },
  {
    name: 'filterHomeCatalog',
    // Fixtures carry no id; supply one so the input is a real HomeCatalogRecipe.
    // id only affects sort tie-breaks, never matching.
    matches: (recipe, filters) => {
      const catalogRecipe: HomeCatalogRecipe = { id: 'fixture', ...recipe };
      return filterHomeCatalog([catalogRecipe], filters, '', 'newest').length === 1;
    },
  },
];

describe.each(engines)('Canonical Filter Contract v1 - $name', ({ matches }) => {
  it('A. same-group OR for a scalar group (cuisine)', () => {
    expect(matches({ cuisine: 'chinese' }, { cuisine: ['chinese', 'japanese'] })).toBe(true);
    expect(matches({ cuisine: 'korean' }, { cuisine: ['chinese', 'japanese'] })).toBe(false);
  });

  it('B. cross-group AND', () => {
    const recipe = { cuisine: 'chinese', primary_protein: 'chicken' };
    expect(matches(recipe, { cuisine: ['chinese', 'japanese'], protein: ['egg', 'tofu'] })).toBe(false);
    expect(matches(recipe, { cuisine: ['chinese', 'japanese'], protein: ['egg', 'chicken'] })).toBe(true);
  });

  it('C. protein filter matches primary_protein, not protein[]', () => {
    const recipe = { primary_protein: 'chicken', protein: ['chicken', 'egg'] };
    expect(matches(recipe, { protein: ['egg'] })).toBe(false);
    expect(matches(recipe, { protein: ['chicken'] })).toBe(true);
  });

  it('D. fish/seafood/shrimp are siblings - no umbrella expansion', () => {
    const seafood = { primary_protein: 'seafood' };
    const fish = { primary_protein: 'fish' };
    const shrimp = { primary_protein: 'shrimp' };

    expect(matches(seafood, { protein: ['seafood'] })).toBe(true);
    expect(matches(fish, { protein: ['seafood'] })).toBe(false);
    expect(matches(shrimp, { protein: ['seafood'] })).toBe(false);

    expect(matches(fish, { protein: ['fish'] })).toBe(true);
    expect(matches(seafood, { protein: ['fish'] })).toBe(false);
    expect(matches(shrimp, { protein: ['fish'] })).toBe(false);

    expect(matches(shrimp, { protein: ['shrimp'] })).toBe(true);
    expect(matches(seafood, { protein: ['shrimp'] })).toBe(false);
    expect(matches(fish, { protein: ['shrimp'] })).toBe(false);

    expect(matches(seafood, { protein: ['seafood', 'fish'] })).toBe(true);
    expect(matches(fish, { protein: ['seafood', 'fish'] })).toBe(true);
    expect(matches(shrimp, { protein: ['seafood', 'fish'] })).toBe(false);

    expect(matches(fish, { protein: ['fish', 'shrimp'] })).toBe(true);
    expect(matches(shrimp, { protein: ['fish', 'shrimp'] })).toBe(true);
    expect(matches(seafood, { protein: ['fish', 'shrimp'] })).toBe(false);
  });

  it('E. flavor matches ANY selected value (OR), not containment of all', () => {
    const sweet = { flavor: ['sweet'] };
    const spicy = { flavor: ['spicy'] };
    const sweetAndSpicy = { flavor: ['sweet', 'spicy'] };
    const sour = { flavor: ['sour'] };

    expect(matches(sweet, { flavor: ['sweet', 'spicy'] })).toBe(true);
    expect(matches(spicy, { flavor: ['sweet', 'spicy'] })).toBe(true);
    expect(matches(sweetAndSpicy, { flavor: ['sweet', 'spicy'] })).toBe(true);
    expect(matches(sour, { flavor: ['sweet', 'spicy'] })).toBe(false);
  });

  it('F. diet matches ANY selected value (OR)', () => {
    const vegetarian = { diet: ['vegetarian'] };
    const highProtein = { diet: ['high_protein'] };
    const both = { diet: ['vegetarian', 'high_protein'] };
    const lowFat = { diet: ['low_fat'] };

    expect(matches(vegetarian, { diet: ['vegetarian', 'high_protein'] })).toBe(true);
    expect(matches(highProtein, { diet: ['vegetarian', 'high_protein'] })).toBe(true);
    expect(matches(both, { diet: ['vegetarian', 'high_protein'] })).toBe(true);
    expect(matches(lowFat, { diet: ['vegetarian', 'high_protein'] })).toBe(false);
  });

  it('G. cross-group AND across a scalar group and two array groups', () => {
    const recipe = { cuisine: 'chinese', flavor: ['sweet'], diet: ['vegetarian'] };
    const selection = { cuisine: ['chinese', 'japanese'], flavor: ['sweet', 'spicy'], diet: ['vegetarian', 'high_protein'] };

    expect(matches(recipe, selection)).toBe(true);
    expect(matches({ ...recipe, cuisine: 'korean' }, selection)).toBe(false);
    expect(matches({ ...recipe, flavor: ['sour'] }, selection)).toBe(false);
  });

  it('H. an empty selection in a group imposes no constraint', () => {
    const recipe = { cuisine: 'chinese', primary_protein: 'chicken', flavor: ['sweet'], diet: ['vegetarian'] };
    expect(matches(recipe, { cuisine: [], protein: [], flavor: [], diet: [] })).toBe(true);
    expect(matches(recipe, { cuisine: ['chinese'], protein: [] })).toBe(true);
  });
});
