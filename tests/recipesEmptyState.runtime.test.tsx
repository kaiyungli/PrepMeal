import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, act } from '@testing-library/react';
import type { ReactNode } from 'react';

const state = vi.hoisted(() => ({ loading: false, fetchError: '' }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('@/components', () => ({ Layout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/RecipeList', () => ({ default: () => <div>測試食譜列表</div> }));
vi.mock('@/components/RecipeModalController', () => ({ default: () => null }));
vi.mock('@/components/ui/Toast', () => ({ default: () => null, useToast: () => ({ toast: null, showToast: vi.fn() }) }));
vi.mock('@/hooks/useUserState', () => ({ useUserState: () => ({ isAuthenticated: false, isFavorite: () => false, isPending: () => false, toggleFavorite: vi.fn() }) }));
vi.mock('@/utils/perf', () => ({ perfNow: () => 0, perfLog: () => {}, measurePageLoadMetrics: () => undefined }));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => ({ prefetchRecipeDetail: vi.fn() }));
vi.mock('@/features/recipes/hooks/useFilteredRecipes', () => ({
  useFilteredRecipes: (_initial: unknown[], { searchQuery }: { searchQuery: string }) => ({
    recipes: searchQuery.trim() ? [] : [{ id: 'recipe-a', name: '番茄炒蛋' }],
    totalCount: searchQuery.trim() ? 0 : 1,
    ...state, loadMore: vi.fn(), hasMore: false, loadingMore: false,
  }),
}));
vi.mock('@/components/recipes/RecipeFilters', () => ({ default: ({ searchQuery, setSearchQuery, clearFilters }: {
  searchQuery: string; setSearchQuery: (value: string) => void; clearFilters: () => void;
}) => <><input aria-label="搜尋食譜" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /><button onClick={clearFilters}>清除全部</button></> }));

import RecipesPage from '@/pages/recipes';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';

beforeEach(() => { state.loading = false; state.fetchError = ''; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const search = () => fireEvent.change(screen.getByRole('textbox', { name: '搜尋食譜' }), { target: { value: 'QA_NO_RECIPE' } });
const emptyTitle = '暫時冇符合條件嘅食譜';

describe('Recipe search empty state and recovery', () => {
  it('shows an empty-state message for search-only zero results', () => {
    render(<RecipesPage initialRecipes={[]} initialTotalCount={0} />);
    search();
    expect(screen.getByRole('heading', { name: emptyTitle })).toBeTruthy();
    expect(screen.queryByText('測試食譜列表')).toBeNull();
  });

  it('clears the search from the empty-state action and restores results', () => {
    render(<RecipesPage initialRecipes={[]} initialTotalCount={0} />);
    search();
    fireEvent.click(screen.getByRole('button', { name: '清除篩選', exact: true }));
    expect((screen.getByRole('textbox', { name: '搜尋食譜' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByText('測試食譜列表')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: emptyTitle })).toBeNull();
  });

  it('clears a search-only query with the existing Clear All button', () => {
    render(<RecipesPage initialRecipes={[]} initialTotalCount={0} />);
    search();
    fireEvent.click(screen.getByRole('button', { name: '清除全部' }));
    expect(screen.getByText('測試食譜列表')).toBeTruthy();
  });

  it('shows loading instead of the empty state while searching', () => {
    state.loading = true;
    render(<RecipesPage initialRecipes={[]} initialTotalCount={0} />);
    search();
    expect(screen.getByText('載入中...')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: emptyTitle })).toBeNull();
  });

  it('shows the request error instead of a misleading zero-results message', () => {
    state.fetchError = '測試載入失敗';
    render(<RecipesPage initialRecipes={[]} initialTotalCount={0} />);
    search();
    expect(screen.getByRole('heading', { name: '載入食譜失敗' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: emptyTitle })).toBeNull();
  });

  it('clears search and selected filters together while preserving sorting', () => {
    const { result } = renderHook(() => useRecipeFilters());
    act(() => { result.current.setSearchQuery('QA_NO_RECIPE'); result.current.setFilters({ cuisine: ['chinese'] }); result.current.setSortBy('oldest'); });
    act(() => result.current.clearFilters());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.sortBy).toBe('oldest');
  });
});
