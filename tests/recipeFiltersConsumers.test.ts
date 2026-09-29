// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';

afterEach(cleanup);

const recipes = [
  { id: '1', name: '番茄牛肉', cuisine: 'chinese', created_at: '2026-01-01' },
  { id: '2', name: '意粉', cuisine: 'western', created_at: '2026-01-02' },
];

// Mirrors recipes.js's own wiring: useRecipeFilters() with no options, and
// RecipeFilters called without applyFilters/hasPendingChanges - chip
// selection, sort, and clear all take effect immediately, with no confirm
// step, through the shared FilterShell/FilterGroupList/FilterFooter
// primitives.
function RecipesPageFilterHarness() {
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    recipeFilterSections,
    activeFilterCount,
    clearFilters,
    filterRecipes,
  } = useRecipeFilters();
  const filtered = filterRecipes(recipes);
  return createElement(
    'div',
    null,
    createElement(RecipeFilters, {
      searchQuery,
      setSearchQuery,
      sortBy,
      setSortBy,
      showFilters,
      setShowFilters,
      recipeFilterSections,
      activeFilterCount,
      clearFilters,
    }),
    createElement('output', { 'data-testid': 'sort-value' }, sortBy),
    createElement('output', { 'data-testid': 'filtered-names' }, filtered.map(r => r.name).join(','))
  );
}

// Mirrors favorites.js's own wiring: useRecipeFilters({ initialShowFilters: false }).
function FavoritesPageFilterHarness() {
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    recipeFilterSections,
    activeFilterCount,
    clearFilters,
    filterRecipes,
  } = useRecipeFilters({ initialShowFilters: false });
  const filtered = filterRecipes(recipes);
  return createElement(
    'div',
    null,
    createElement(RecipeFilters, {
      searchQuery,
      setSearchQuery,
      sortBy,
      setSortBy,
      showFilters,
      setShowFilters,
      recipeFilterSections,
      activeFilterCount,
      clearFilters,
    }),
    createElement('output', { 'data-testid': 'filtered-names' }, filtered.map(r => r.name).join(','))
  );
}

describe('/recipes: chip selection, sort, and clear apply live through the shared filter shell', () => {
  it('toggling a cuisine chip immediately filters the list and updates the active count badge', () => {
    render(createElement(RecipesPageFilterHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    fireEvent.click(screen.getByRole('button', { name: '中式' }));
    expect(screen.getByTestId('filtered-names').textContent).toBe('番茄牛肉');
    // The active-count badge lives inside the unified disclosure button
    // itself (hybrid correction - see filterShellCanonical.test.ts).
    expect(within(toggle).getByText('1')).toBeTruthy();
  });

  it('changing sort updates state immediately, with no confirm step', () => {
    render(createElement(RecipesPageFilterHarness));
    fireEvent.change(screen.getByRole('combobox', { name: '排序方式' }), { target: { value: 'oldest' } });
    expect(screen.getByTestId('sort-value').textContent).toBe('oldest');
  });

  it('clear removes an active chip selection', () => {
    render(createElement(RecipesPageFilterHarness));
    fireEvent.click(screen.getByRole('button', { name: '中式' }));
    expect(screen.getByTestId('filtered-names').textContent).toBe('番茄牛肉');

    fireEvent.click(screen.getByRole('button', { name: '清除全部' }));
    expect(screen.getByTestId('filtered-names').textContent).toBe('意粉,番茄牛肉');
    expect(screen.getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('/favorites: chip selection and clear apply live to the local favorites list', () => {
  it('toggling a cuisine chip immediately filters the in-memory favorites list', () => {
    render(createElement(FavoritesPageFilterHarness));
    fireEvent.click(screen.getByRole('button', { name: /^篩選/ })); // panel starts collapsed on /favorites
    fireEvent.click(screen.getByRole('button', { name: '西式' }));
    expect(screen.getByTestId('filtered-names').textContent).toBe('意粉');
  });

  it('clear restores the full favorites list', () => {
    render(createElement(FavoritesPageFilterHarness));
    fireEvent.click(screen.getByRole('button', { name: /^篩選/ }));
    fireEvent.click(screen.getByRole('button', { name: '西式' }));
    expect(screen.getByTestId('filtered-names').textContent).toBe('意粉');

    fireEvent.click(screen.getByRole('button', { name: '清除全部' }));
    expect(screen.getByTestId('filtered-names').textContent).toBe('意粉,番茄牛肉');
  });
});
