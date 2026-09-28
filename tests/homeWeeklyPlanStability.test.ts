// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useHomePageController } from '@/features/home/hooks/useHomePageController';
import { generateWeeklyPlan } from '@/services/weeklyPlan';

vi.mock('@/services/weeklyPlan', () => ({
  generateWeeklyPlan: vi.fn((recipes: Array<{ id: string }>) => [{
    dayIndex: 0,
    dayName: '週一',
    date: null,
    items: [{ recipeId: recipes[0].id, recipeName: recipes[0].id }],
  }]),
}));
vi.mock('@/hooks/useUserState', () => ({
  useUserState: () => ({ isAuthenticated: false, isFavorite: () => false, toggleFavorite: vi.fn() }),
}));
vi.mock('@/hooks/useShoppingListPreview', () => ({
  useShoppingListPreview: () => ({ previewList: [], isLoading: false, error: null, isAuthRequired: false, refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('homepage weekly plan', () => {
  it('stays stable when visible results change; refresh generates a new plan', () => {
    const planRecipes = [{ id: 'original', name: '原本食譜' }];
    const { result, rerender } = renderHook(
      ({ visibleResults }) => {
        // Visible results change during filtering/pagination, but the hero
        // always draws from the original homepage recipes.
        void visibleResults;
        return useHomePageController({ planRecipes });
      },
      { initialProps: { visibleResults: ['original'] } }
    );
    expect(generateWeeklyPlan).toHaveBeenCalledTimes(1);
    const originalPlan = result.current.weeklyPlan;

    rerender({ visibleResults: ['filtered', 'loaded-more'] });
    expect(generateWeeklyPlan).toHaveBeenCalledTimes(1);
    expect(result.current.weeklyPlan).toBe(originalPlan);

    act(() => result.current.handleRefreshPlan());
    expect(generateWeeklyPlan).toHaveBeenCalledTimes(2);
    expect(generateWeeklyPlan).toHaveBeenLastCalledWith(planRecipes);
  });
});
