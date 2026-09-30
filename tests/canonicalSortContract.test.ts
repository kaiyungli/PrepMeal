// @vitest-environment jsdom
//
// Canonical Recipe Sorting Contract regression coverage.
//
// Rule: for all 6 user-facing sort modes, a missing/unknown value never
// outranks a known value (NULL LAST), and ties are broken deterministically
// on id - ascending for "oldest", descending for every other mode.
//
// These assertions run against both live in-memory engines used in
// production: filterHomeCatalog (Home) and useRecipeFilters().filterRecipes
// (Favorites). The third engine, /api/recipes, is covered separately in
// tests/recipesSortApi.test.ts via the actual generated Supabase query
// string, since its ordering lives in a query builder rather than an
// in-memory comparator.
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { filterHomeCatalog } from '@/features/home/filterHomeCatalog';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';

type Engine = { name: string; sort: (recipes: Record<string, unknown>[], sortBy: string) => { id: unknown }[] };

function sortWithUseRecipeFilters(recipes: Record<string, unknown>[], sortBy: string) {
  const { result } = renderHook(() => useRecipeFilters());
  act(() => result.current.setSortBy(sortBy));
  return result.current.filterRecipes(recipes);
}

const engines: Engine[] = [
  {
    name: 'filterHomeCatalog',
    sort: (recipes, sortBy) => filterHomeCatalog(recipes as never, {}, '', sortBy),
  },
  {
    name: 'useRecipeFilters().filterRecipes',
    sort: (recipes, sortBy) => sortWithUseRecipeFilters(recipes, sortBy),
  },
];

describe.each(engines)('Canonical Sort Contract v1 - $name', ({ sort }) => {
  it('newest: known dates before null, equal known date -> id DESC, both null -> id DESC', () => {
    const recipes = [
      { id: 1, created_at: '2026-01-01' },
      { id: 2, created_at: null },
      { id: 3, created_at: '2026-01-02' },
      { id: 4, created_at: '2026-01-02' }, // ties recipe 3
      { id: 5, created_at: null }, // ties recipe 2 (both null)
    ];
    const ids = sort(recipes, 'newest').map(r => r.id);
    // known dates (newest first) before null; equal known dates -> id DESC (4 before 3);
    // both-null tie -> id DESC (5 before 2).
    expect(ids).toEqual([4, 3, 1, 5, 2]);
  });

  it('oldest: known dates before null, equal known date -> id ASC, both null -> id ASC', () => {
    const recipes = [
      { id: 1, created_at: '2026-01-02' },
      { id: 2, created_at: null },
      { id: 3, created_at: '2026-01-01' },
      { id: 4, created_at: '2026-01-01' }, // ties recipe 3
      { id: 5, created_at: null }, // ties recipe 2 (both null)
    ];
    const ids = sort(recipes, 'oldest').map(r => r.id);
    // known dates (oldest first) before null; equal known dates -> id ASC (3 before 4);
    // both-null tie -> id ASC (2 before 5).
    expect(ids).toEqual([3, 4, 1, 2, 5]);
  });

  it('popular: null last, equal known -> id DESC, both null -> id DESC, genuine zero is not treated as missing', () => {
    const recipes = [
      { id: 1, times_shown: 5 },
      { id: 2, times_shown: null },
      { id: 3, times_shown: 10 },
      { id: 4, times_shown: 10 }, // ties recipe 3
      { id: 5, times_shown: 0 }, // genuine zero - must outrank null, not collide with it
      { id: 6, times_shown: null }, // ties recipe 2 (both null)
    ];
    const ids = sort(recipes, 'popular').map(r => r.id);
    expect(ids).toEqual([4, 3, 1, 5, 6, 2]);
  });

  it('time_short: null last, equal known -> id DESC, both null -> id DESC, genuine zero is not treated as missing', () => {
    const recipes = [
      { id: 1, total_time_minutes: 30 },
      { id: 2, total_time_minutes: null },
      { id: 3, total_time_minutes: 10 },
      { id: 4, total_time_minutes: 10 }, // ties recipe 3
      { id: 5, total_time_minutes: 0 }, // genuine zero - must outrank null, not collide with it
      { id: 6, total_time_minutes: null }, // ties recipe 2 (both null)
    ];
    const ids = sort(recipes, 'time_short').map(r => r.id);
    expect(ids).toEqual([5, 4, 3, 1, 6, 2]);
  });

  it('calories_low: null last, equal known -> id DESC, both null -> id DESC, genuine zero is not treated as missing', () => {
    const recipes = [
      { id: 1, calories_per_serving: 400 },
      { id: 2, calories_per_serving: null },
      { id: 3, calories_per_serving: 200 },
      { id: 4, calories_per_serving: 200 }, // ties recipe 3
      { id: 5, calories_per_serving: 0 }, // genuine zero - must outrank null, not collide with it
      { id: 6, calories_per_serving: null }, // ties recipe 2 (both null)
    ];
    const ids = sort(recipes, 'calories_low').map(r => r.id);
    expect(ids).toEqual([5, 4, 3, 1, 6, 2]);
  });

  it('protein_high: null last, equal known -> id DESC, both null -> id DESC, genuine zero is not treated as missing', () => {
    const recipes = [
      { id: 1, protein_g: 15 },
      { id: 2, protein_g: null },
      { id: 3, protein_g: 30 },
      { id: 4, protein_g: 30 }, // ties recipe 3
      { id: 5, protein_g: 0 }, // genuine zero - must outrank null, not collide with it
      { id: 6, protein_g: null }, // ties recipe 2 (both null)
    ];
    const ids = sort(recipes, 'protein_high').map(r => r.id);
    expect(ids).toEqual([4, 3, 1, 5, 6, 2]);
  });
});
