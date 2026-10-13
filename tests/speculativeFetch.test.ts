// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { canStartSpeculativeFetch } from '@/utils/speculativeFetch';
import { prefetchRecipeDetail, setCachedRecipeDetail } from '@/features/recipes/services/recipeDetailClientCache';
import { useRecipeDetailModal } from '@/features/recipes/hooks/useRecipeDetailModal';
import { useFilteredRecipes } from '@/features/recipes/hooks/useFilteredRecipes';
import { fetchRecipesFromAPI } from '@/features/recipes/services/fetchRecipesFromAPI';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';

const { router } = vi.hoisted(() => ({ router: { prefetch: vi.fn() } }));
vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('@/components/RecipeCard', () => ({ default: () => null }));
vi.mock('@/features/recipes/services/fetchRecipesFromAPI', () => ({ fetchRecipesFromAPI: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('browsers without connection hints retain existing speculative behavior', () => {
  vi.stubGlobal('navigator', { onLine: true });
  expect(canStartSpeculativeFetch()).toBe(true);
});
it('server rendering does not start speculative requests', () => {
  vi.stubGlobal('navigator', undefined);
  expect(canStartSpeculativeFetch()).toBe(false);
});
it('home route preload rechecks visibility when its timer runs', async () => {
  vi.useFakeTimers();
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  render(createElement(HomeRecipeGrid, { recipes: [{ id: 'home-a' }, { id: 'home-b' }] }));
  visibility.mockReturnValue('hidden');
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  expect(router.prefetch).not.toHaveBeenCalled();
});
it('home route preload retains normal behavior without network hints', async () => {
  vi.useFakeTimers(); vi.stubGlobal('navigator', { onLine: true });
  render(createElement(HomeRecipeGrid, { recipes: [{ id: 'home-c' }] }));
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(router.prefetch).toHaveBeenCalledExactlyOnceWith('/recipes/home-c');
});
it('save-data blocks detail speculation while cache reuse and explicit modal loading still work', async () => {
  vi.stubGlobal('navigator', { onLine: true, connection: { saveData: true } });
  const recipe = { id: 'budget-direct', name: 'Direct', ingredients: [{ name: 'Test' }], steps: ['Test'] };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recipe }) }));
  expect(await prefetchRecipeDetail(recipe.id)).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  const cached = { ...recipe, id: 'budget-cached' }; setCachedRecipeDetail(cached.id, cached);
  expect(await prefetchRecipeDetail(cached.id)).toEqual(cached); expect(fetch).not.toHaveBeenCalled();
  const selected = { id: recipe.id, name: recipe.name };
  const options = { onClose: vi.fn() };
  const modal = renderHook(() => useRecipeDetailModal(selected, options));
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(modal.result.current.recipe?.id).toBe(recipe.id);
});
it('slow network skips automatic next-page preload but explicit loadMore still fetches', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true, connection: { effectiveType: '2g' } });
  vi.mocked(fetchRecipesFromAPI).mockResolvedValue({ recipes: [{ id: 'next' }], total: 2 });
  const filters = {};
  const hook = renderHook(() => useFilteredRecipes([{ id: 'first' }], { filters, searchQuery: '', initialTotalCount: 2 }));
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  expect(fetchRecipesFromAPI).not.toHaveBeenCalled();
  await act(async () => { hook.result.current.loadMore(); });
  expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1);
  expect(hook.result.current.recipes.map(r => r.id)).toEqual(['first', 'next']);
});
