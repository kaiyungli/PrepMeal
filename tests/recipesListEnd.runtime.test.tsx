import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
const state = vi.hoisted(() => ({ loading: false, loadingMore: false, hasMore: true, fetchError: '', loadMore: vi.fn() }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('@/components', () => ({ Layout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/RecipeList', () => ({ default: () => <div data-testid="cards">24 cards</div> }));
vi.mock('@/components/RecipeModalController', () => ({ default: () => null }));
vi.mock('@/components/recipes/RecipeFilters', () => ({ default: () => null }));
vi.mock('@/components/ui/Toast', () => ({ default: () => null, useToast: () => ({ toast: null, showToast: vi.fn() }) }));
vi.mock('@/hooks/useUserState', () => ({ useUserState: () => ({ isFavorite: () => false, isPending: () => false }) }));
vi.mock('@/utils/perf', () => ({ perfNow: () => 0, perfLog: () => {}, measurePageLoadMetrics: () => undefined }));
vi.mock('@/features/recipes/hooks/useRecipeDetailPrefetch', () => ({ useRecipeDetailPrefetch: () => {} }));
vi.mock('@/features/performance/useNavigationDataReady', () => ({ useNavigationDataReady: () => {} }));
vi.mock('@/features/recipes/hooks/useFilteredRecipes', () => ({ useFilteredRecipes: () => ({
  ...state, recipes: [{ id: 'a', name: '番茄炒蛋' }], totalCount: 303, isListSettled: () => true,
}) }));
import RecipesPage from '@/pages/recipes';
const recipeIndex = [{ key: 'soup', title: '湯', recipes: Array.from({ length: 303 }, (_, i) => ({ slug: `dish-${i}`, name: `食譜${i}` })) }];
beforeEach(() => {
  Object.assign(state, { loading: false, loadingMore: false, hasMore: true, fetchError: '' });
  state.loadMore.mockReset();
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(50000);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount(top: number) {
  const view = render(<RecipesPage initialRecipes={[]} initialTotalCount={303} recipeIndex={recipeIndex} />);
  const end = view.container.querySelector('[data-recipe-list-end]')!;
  const rect = end ? vi.spyOn(end, 'getBoundingClientRect').mockImplementation(() => ({ top } as DOMRect)) : vi.fn();
  return { ...view, rect };
}
describe('recipe-list pagination with a full directory below the cards', () => {
  it.each([390, 1440])('loads at the card-list end while the document bottom is far away (%ipx viewport)', width => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
    const { container } = mount(window.innerHeight + 900);
    expect(container.querySelectorAll('section[aria-labelledby="recipe-index"] a')).toHaveLength(303);
    expect(document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)).toBeGreaterThan(1000);
    fireEvent.scroll(window);
    expect(state.loadMore).toHaveBeenCalledTimes(1);
  });
  it('waits until the cards are near, then handles a resized viewport too', () => {
    const { rect } = mount(window.innerHeight + 1001);
    fireEvent.scroll(window); expect(state.loadMore).not.toHaveBeenCalled();
    rect.mockReturnValue({ top: window.innerHeight + 1000 } as DOMRect);
    fireEvent.resize(window); expect(state.loadMore).toHaveBeenCalledTimes(1);
  });
  it.each(['loading', 'loadingMore', 'exhausted', 'error'])('does not request more while %s', status => {
    if (status === 'loading') state.loading = true;
    if (status === 'loadingMore') state.loadingMore = true;
    if (status === 'exhausted') state.hasMore = false;
    if (status === 'error') state.fetchError = 'failed';
    mount(0); fireEvent.scroll(window); expect(state.loadMore).not.toHaveBeenCalled();
  });
  it('removes both listeners when leaving the page', () => {
    const { unmount } = mount(0); unmount();
    fireEvent.scroll(window); fireEvent.resize(window);
    expect(state.loadMore).not.toHaveBeenCalled();
  });
});
