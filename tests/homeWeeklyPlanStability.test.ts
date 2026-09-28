// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PlanDay, Recipe } from '@/services/weeklyPlan';

// generateWeeklyPlan is mocked deterministically (call N picks recipes[(N-1) %
// length]) so tests can assert exact call counts and exact selection
// distinctness without depending on Math.random() - avoids flakiness while
// still exercising the real cache module's real logic around this mock.
const { generateWeeklyPlanMock, resetCallCounter } = vi.hoisted(() => {
  let n = 0;
  return {
    resetCallCounter: () => { n = 0; },
    generateWeeklyPlanMock: vi.fn((recipes: Recipe[]): PlanDay[] => {
      n += 1;
      const chosen = recipes[(n - 1) % recipes.length];
      return [{
        dayIndex: 0,
        dayName: '週一',
        date: null,
        items: [{
          recipeId: chosen?.id ?? null,
          recipeName: chosen?.name ?? '',
          recipeImage: null,
          servings: 2,
          mealSlot: 'dinner',
          done: false,
        }],
      }];
    }),
  };
});

vi.mock('@/services/weeklyPlan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/weeklyPlan')>();
  return { ...actual, generateWeeklyPlan: generateWeeklyPlanMock };
});
vi.mock('@/hooks/useUserState', () => ({
  useUserState: () => ({ isAuthenticated: false, isFavorite: () => false, toggleFavorite: vi.fn() }),
}));
vi.mock('@/hooks/useShoppingListPreview', () => ({
  useShoppingListPreview: () => ({ previewList: [], isLoading: false, error: null, isAuthRequired: false, refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetCallCounter();
});

const catalog = Array.from({ length: 6 }, (_, i) => ({
  id: `r${i}`,
  name: `recipe-${i}`,
  cuisine: i % 2 === 0 ? 'chinese' : 'japanese',
  created_at: `2026-01-${(i % 28) + 1}`,
}));

const otherCatalog = Array.from({ length: 6 }, (_, i) => ({
  id: `x${i}`,
  name: `other-${i}`,
  cuisine: i % 2 === 0 ? 'chinese' : 'japanese',
  created_at: `2026-02-${(i % 28) + 1}`,
}));

// vi.resetModules() gives each caller a brand-new module registry - this is
// how we simulate "a fresh page load" (full reload / new tab) versus reusing
// the same already-loaded module instance (client-side route remount within
// one SPA session, which is what real Next.js Pages Router navigation does).
async function loadModules() {
  const { useHomeRecipeFilters } = await import('@/features/home/hooks/useHomeRecipeFilters');
  const { useHomePageController } = await import('@/features/home/hooks/useHomePageController');
  return { useHomeRecipeFilters, useHomePageController };
}

function makeHarness(
  useHomeRecipeFilters: typeof import('@/features/home/hooks/useHomeRecipeFilters').useHomeRecipeFilters,
  useHomePageController: typeof import('@/features/home/hooks/useHomePageController').useHomePageController,
  recipes: typeof catalog
) {
  return function useHomeLikeController() {
    // Mirrors src/pages/index.js exactly: both hooks called in the same
    // function body, planRecipes = initialRecipes (the raw, SSR-stable prop).
    const filters = useHomeRecipeFilters({ initialRecipes: recipes, initialTotalCount: recipes.length, catalog: recipes });
    const controller = useHomePageController({ planRecipes: recipes, showToast: undefined });
    return { filters, controller };
  };
}

describe('homepage weekly plan: within-mount stability (796d2fd coverage, preserved and strengthened)', () => {
  it('search/filter/sort/load-more/unrelated re-renders do not regenerate the plan', async () => {
    vi.resetModules();
    const { useHomeRecipeFilters, useHomePageController } = await loadModules();
    const { result } = renderHook(makeHarness(useHomeRecipeFilters, useHomePageController, catalog));

    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
    const originalPlan = result.current.controller.weeklyPlan;

    act(() => result.current.filters.setSearchQuery('雞')); // draft, unconfirmed
    act(() => result.current.filters.setShowFilters(true));
    act(() => {
      const section = result.current.filters.recipeFilterSections.find((s: { id: string }) => s.id === 'cuisine');
      section?.onToggle('chinese');
    });
    act(() => result.current.filters.applyFilters()); // confirms - recipesList changes
    act(() => result.current.filters.setSortBy('oldest'));
    act(() => result.current.filters.applyFilters());
    act(() => result.current.filters.loadMore());
    act(() => result.current.filters.clearAppliedFilters());

    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
    expect(result.current.controller.weeklyPlan).toBe(originalPlan);
  });
});

describe('homepage weekly plan: unmount -> remount stability (the regression this round fixes)', () => {
  it('preserves the same plan across an unmount + remount within the same module lifetime (simulates / -> other route -> / client-side navigation)', async () => {
    vi.resetModules();
    const { useHomeRecipeFilters, useHomePageController } = await loadModules();
    const harness = makeHarness(useHomeRecipeFilters, useHomePageController, catalog);

    const first = renderHook(harness);
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
    const firstPlan = first.result.current.controller.weeklyPlan;
    first.unmount(); // simulates navigating away from "/"

    const second = renderHook(harness); // simulates navigating back to "/" (same SPA session)
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1); // no new generation
    expect(second.result.current.controller.weeklyPlan).toEqual(firstPlan);
  });

  it('manual refresh always generates a new plan immediately, and that becomes the plan preserved across the next remount', async () => {
    vi.resetModules();
    const { useHomeRecipeFilters, useHomePageController } = await loadModules();
    const harness = makeHarness(useHomeRecipeFilters, useHomePageController, catalog);

    const first = renderHook(harness);
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
    const originalPlan = first.result.current.controller.weeklyPlan;

    act(() => first.result.current.controller.handleRefreshPlan());
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(2); // bypassed the cache, generated fresh
    const refreshedPlan = first.result.current.controller.weeklyPlan;
    expect(refreshedPlan).not.toEqual(originalPlan);

    first.unmount();
    const second = renderHook(harness);
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(2); // remount reuses the refreshed selection, no 3rd call
    expect(second.result.current.controller.weeklyPlan).toEqual(refreshedPlan);
  });

  it('a cached recipe id no longer present in the current planRecipes triggers a full, valid regeneration - never a partial/invalid plan', async () => {
    vi.resetModules();
    const { useHomeRecipeFilters, useHomePageController } = await loadModules();

    const first = renderHook(makeHarness(useHomeRecipeFilters, useHomePageController, catalog));
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
    first.unmount();

    // Remount with a DIFFERENT recipe pool - the cached id from `catalog`
    // cannot exist in `otherCatalog`, so the cache must be discarded, not
    // partially trusted.
    const second = renderHook(makeHarness(useHomeRecipeFilters, useHomePageController, otherCatalog));
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(2); // fell back to a full regeneration
    const plan = second.result.current.controller.weeklyPlan;
    const validIds = new Set(otherCatalog.map(r => r.id));
    for (const day of plan) {
      for (const item of day.items) {
        expect(validIds.has(item.recipeId as string)).toBe(true); // every item resolves against the CURRENT pool
      }
    }
  });

  it('a fresh module instance (simulating a full browser reload or a new tab) behaves as a fresh session, not a continuation of the old plan', async () => {
    vi.resetModules();
    const first = await loadModules();
    const firstRender = renderHook(makeHarness(first.useHomeRecipeFilters, first.useHomePageController, catalog));
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    // A genuinely fresh module registry - the in-memory cache from the
    // previous "session" cannot exist here, by construction (no
    // sessionStorage/localStorage is ever touched). Clear the mock's call
    // history so this assertion measures only the second session, not a
    // cumulative total across both simulated sessions.
    generateWeeklyPlanMock.mockClear();
    vi.resetModules();
    resetCallCounter();
    const second = await loadModules();
    renderHook(makeHarness(second.useHomeRecipeFilters, second.useHomePageController, catalog));
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1); // generated fresh, not "0 because cache survived"
  });
});

describe('generateWeeklyPlan(): recipe scarcity never produces a null-recipeId item', () => {
  it('with fewer recipes than daysCount*itemsPerDay, later slots are simply absent from items[] - never a { recipeId: null } placeholder', async () => {
    // Bypasses this file's vi.mock('@/services/weeklyPlan', ...) to exercise
    // the REAL, unmocked implementation directly - this is the empirical
    // proof behind homeWeeklyPlanCache.ts's CachedSlot.recipeId narrowing to
    // non-null (a correctness hole was found in review: the cache used to
    // accept and then silently drop a null-recipeId slot during rehydration,
    // which would have been a real bug IF such a slot could ever occur).
    const { generateWeeklyPlan: realGenerateWeeklyPlan } = await vi.importActual<typeof import('@/services/weeklyPlan')>('@/services/weeklyPlan');

    const scarceRecipes = [{ id: 'only-1', name: 'Only Recipe' }]; // 1 recipe; default is 5 days x 2 = 10 slots
    const plan = realGenerateWeeklyPlan(scarceRecipes, 5, 2);

    expect(plan).toHaveLength(5); // every day is still present...
    let totalItems = 0;
    for (const day of plan) {
      for (const item of day.items) {
        totalItems += 1;
        expect(item.recipeId).not.toBeNull(); // ...but no item ever has a null recipeId
        expect(item.recipeId).toBe('only-1');
      }
    }
    expect(totalItems).toBe(1); // only one slot, anywhere, actually got an item - the rest are simply absent

    // Zero recipes: every day has a completely empty items[], still no nulls.
    const emptyPlan = realGenerateWeeklyPlan([], 5, 2);
    expect(emptyPlan).toEqual([]); // generateWeeklyPlan short-circuits entirely for an empty pool
  });
});

describe('homepage weekly plan cache: a legitimately incomplete day (recipe scarcity) survives remount unchanged', () => {
  it('a day with fewer items than usual (simulating the real generator running out of recipes) round-trips through cache + rehydration with no items lost or invented', async () => {
    vi.resetModules();
    const { useHomeRecipeFilters, useHomePageController } = await loadModules();

    // A single generateWeeklyPlan() call shaped exactly like the real
    // generator's scarcity output: day 0 has one item, day 1 has none.
    generateWeeklyPlanMock.mockImplementationOnce((recipes: Recipe[]) => [
      {
        dayIndex: 0, dayName: '週一', date: null,
        items: [{ recipeId: recipes[0].id, recipeName: recipes[0].name, recipeImage: null, servings: 2, mealSlot: 'dinner', done: false }],
      },
      { dayIndex: 1, dayName: '週二', date: null, items: [] },
    ]);

    const harness = makeHarness(useHomeRecipeFilters, useHomePageController, catalog);
    const first = renderHook(harness);
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
    const firstPlan = first.result.current.controller.weeklyPlan;
    expect(firstPlan[0].items).toHaveLength(1);
    expect(firstPlan[1].items).toHaveLength(0);
    first.unmount();

    const second = renderHook(harness);
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1); // cache hit, no regeneration
    const secondPlan = second.result.current.controller.weeklyPlan;
    expect(secondPlan).toEqual(firstPlan); // the short day stays short - not silently dropped, not invented
    expect(secondPlan[1].items).toHaveLength(0);
  });

  it('defensively excludes a null-recipeId item from what gets cached, without crashing or losing the valid items around it (belt-and-braces: covers the wider PlanItem type even though the real generator cannot produce this today)', async () => {
    vi.resetModules();
    const { useHomeRecipeFilters, useHomePageController } = await loadModules();

    // A shape that could never come from the real generateWeeklyPlan() (see
    // the "recipe scarcity never produces a null-recipeId item" tests above)
    // but is still permitted by PlanItem's wider type from weeklyPlan.ts.
    // This proves toSelection()'s defensive filter actually filters (not
    // just that an already-empty array survives), and that it does not
    // reject or corrupt the OTHER, valid items in the same day.
    // Deliberately typed as the wider PlanDay[] (not the narrower shape the
    // mock's own inferred signature would otherwise force recipeId into) -
    // this test exists specifically to exercise a recipeId: null item, which
    // is only representable via PlanItem's real, wider type.
    generateWeeklyPlanMock.mockImplementationOnce((recipes: Recipe[]): PlanDay[] => [
      {
        dayIndex: 0, dayName: '週一', date: null,
        items: [
          { recipeId: null, recipeName: 'should never be cached', recipeImage: null, servings: 2, mealSlot: 'lunch', done: false },
          { recipeId: recipes[0].id, recipeName: recipes[0].name, recipeImage: null, servings: 2, mealSlot: 'dinner', done: false },
        ],
      },
    ]);

    const harness = makeHarness(useHomeRecipeFilters, useHomePageController, catalog);
    const first = renderHook(harness);
    // getOrCreateWeeklyPlan() returns the re-hydrated cache rather than the
    // raw generator output, so the null-id item is already gone on first
    // mount too - not just after a remount. This is what makes "the cache
    // never silently drops a slot after navigation" a real guarantee rather
    // than one that only happens to hold once a remount has already
    // filtered things: without it, first mount would show 2 items and only
    // remount would show 1, which is itself the kind of mount-dependent
    // inconsistency this whole fix exists to rule out.
    const firstItems = first.result.current.controller.weeklyPlan[0].items;
    expect(firstItems).toHaveLength(1);
    expect(firstItems[0].recipeId).toBe(catalog[0].id);
    first.unmount();

    const second = renderHook(harness);
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1); // cache hit - no crash, no forced regeneration
    const cachedItems = second.result.current.controller.weeklyPlan[0].items;
    expect(cachedItems).toEqual(firstItems); // first mount and remount agree exactly
    expect(cachedItems).toHaveLength(1); // the null-id item was excluded from the cache
    expect(cachedItems[0].recipeId).toBe(catalog[0].id); // the valid item survives intact
  });
});
