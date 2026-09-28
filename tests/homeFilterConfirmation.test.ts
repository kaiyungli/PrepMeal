// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useHomeRecipeFilters } from '@/features/home/hooks/useHomeRecipeFilters';

afterEach(cleanup);

const catalog = [
  { id: '1', name: '中式魚飯', cuisine: 'chinese', created_at: '2026-01-02' },
  { id: '2', name: '意粉', cuisine: 'italian', created_at: '2026-01-01' },
];

function HomeFilterHarness() {
  const state = useHomeRecipeFilters({ catalog, initialRecipes: catalog, initialTotalCount: 2 });
  return createElement('div', null,
    createElement(RecipeFilters, {
      searchQuery: state.searchQuery,
      setSearchQuery: state.setSearchQuery,
      sortBy: state.sortBy,
      setSortBy: state.setSortBy,
      showFilters: state.showFilters,
      setShowFilters: state.setShowFilters,
      recipeFilterSections: state.recipeFilterSections,
      activeFilterCount: state.activeFilterCount,
      clearFilters: state.clearFilters,
      applyFilters: state.applyFilters,
      hasPendingChanges: state.hasPendingChanges,
    }),
    createElement('output', { 'data-testid': 'result-names' }, state.recipesList.map(recipe => recipe.name).join(',')),
  );
}

describe('homepage filter confirmation', () => {
  it('keeps results unchanged while selecting options, then applies on confirmation', () => {
    render(createElement(HomeFilterHarness));
    fireEvent.click(screen.getByRole('button', { name: '中式' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    expect(screen.getByText('有未套用的選項')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    fireEvent.click(screen.getByRole('button', { name: '清除全部' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
    fireEvent.click(screen.getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
  });

  it('submits the search when Enter is pressed', () => {
    render(createElement(HomeFilterHarness));
    const input = screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩');
    fireEvent.change(input, { target: { value: '魚飯' } });
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
  });

  it('waits for confirmation before changing the sort order', () => {
    render(createElement(HomeFilterHarness));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'oldest' } });
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    fireEvent.click(screen.getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('意粉,中式魚飯');
  });
});
