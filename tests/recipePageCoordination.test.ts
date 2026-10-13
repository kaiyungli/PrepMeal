// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFilteredRecipes } from '@/features/recipes/hooks/useFilteredRecipes';
import { fetchRecipesFromAPI } from '@/features/recipes/services/fetchRecipesFromAPI';
vi.mock('@/features/recipes/services/fetchRecipesFromAPI', () => ({ fetchRecipesFromAPI: vi.fn() }));
type Result = { recipes: { id: string }[]; total: number };
const result = (id: string, total = 2): Result => ({ recipes: [{ id }], total });
function deferred() { let resolve!: (r: Result) => void; let reject!: (e: Error) => void; const promise = new Promise<Result>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
beforeEach(() => { vi.useFakeTimers(); vi.mocked(fetchRecipesFromAPI).mockReset(); vi.mocked(fetchRecipesFromAPI).mockResolvedValue(result('next')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const tick = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const mount = () => { const filters = {}; return renderHook(() => useFilteredRecipes([{ id: 'first' }], { filters, searchQuery: '', initialTotalCount: 2 })); };
it('loadMore joins a pending next-page preload with only one network call', async () => {
  const next = deferred(); vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(next.promise);
  const page = mount(); await tick(500); expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1);
  act(() => { page.result.current.loadMore(); page.result.current.loadMore(); });
  expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1);
  await act(async () => { next.resolve(result('next')); });
  expect(page.result.current.recipes.map(r => r.id)).toEqual(['first', 'next']); expect(page.result.current.loadingMore).toBe(false);
});
it('a completed preloaded page is consumed without a second network call', async () => {
  const page = mount(); await tick(500); act(() => { page.result.current.loadMore(); }); await act(async () => {});
  expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1); expect(page.result.current.recipes.map(r => r.id)).toEqual(['first', 'next']);
});
it('repeated foreground loadMore calls before a render issue only one request', async () => {
  const next = deferred(); vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(next.promise);
  const page = mount(); act(() => { page.result.current.loadMore(); page.result.current.loadMore(); });
  await tick(600); expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1);
  await act(async () => { next.resolve(result('next')); }); expect(page.result.current.recipes).toHaveLength(2);
});
it('a failed shared preload releases the foreground lock and allows retry', async () => {
  const next = deferred(); vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(next.promise);
  const page = mount(); await tick(500); act(() => { page.result.current.loadMore(); });
  await act(async () => { next.reject(new Error('synthetic')); });
  expect(page.result.current.loadingMore).toBe(false); expect(page.result.current.recipes).toHaveLength(1);
  await act(async () => { page.result.current.loadMore(); });
  expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(2); expect(page.result.current.recipes).toHaveLength(2);
});
it('old preloaded results cannot seed the new search page cache', async () => {
  const old = deferred(); vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(old.promise);
  const filters = {};
  const page = renderHook(({ search }) => useFilteredRecipes([{ id: 'first' }], { filters, searchQuery: search, initialTotalCount: 2 }), { initialProps: { search: '' } });
  await tick(500); page.rerender({ search: 'coordination-new-cache' });
  vi.mocked(fetchRecipesFromAPI).mockResolvedValueOnce(result('new-first'));
  await tick(300); await act(async () => { old.resolve(result('stale')); });
  vi.mocked(fetchRecipesFromAPI).mockResolvedValueOnce(result('new-next'));
  await act(async () => { page.result.current.loadMore(); });
  expect(page.result.current.recipes.map(r => r.id)).toEqual(['new-first', 'new-next']); expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(3);
});
it('an old foreground response cannot append into a new search or release its pending load', async () => {
  const old = deferred(); const fresh = deferred();
  vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(old.promise);
  const filters = {};
  const page = renderHook(({ search }) => useFilteredRecipes([{ id: 'first' }], { filters, searchQuery: search, initialTotalCount: 2 }), { initialProps: { search: '' } });
  act(() => { page.result.current.loadMore(); }); page.rerender({ search: 'coordination-new-foreground' });
  vi.mocked(fetchRecipesFromAPI).mockResolvedValueOnce(result('new-first')); await tick(300);
  vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(fresh.promise); act(() => { page.result.current.loadMore(); });
  await act(async () => { old.resolve(result('stale')); });
  expect(page.result.current.loadingMore).toBe(true); expect(page.result.current.recipes.map(r => r.id)).toEqual(['new-first']);
  await act(async () => { fresh.resolve(result('new-next')); }); expect(page.result.current.recipes.map(r => r.id)).toEqual(['new-first', 'new-next']);
});
it('disabling and re-enabling retires an old same-query request', async () => {
  const old = deferred(); vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(old.promise);
  const filters = {};
  const page = renderHook(({ enabled }) => useFilteredRecipes([{ id: 'first' }], { filters, searchQuery: '', enabled, initialTotalCount: 2 }), { initialProps: { enabled: true } });
  await tick(500); page.rerender({ enabled: false }); act(() => { page.result.current.loadMore(); });
  expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1);
  page.rerender({ enabled: true }); vi.mocked(fetchRecipesFromAPI).mockResolvedValueOnce(result('new-first')); await tick(300);
  await act(async () => { old.resolve(result('stale')); });
  vi.mocked(fetchRecipesFromAPI).mockResolvedValueOnce(result('new-next')); await act(async () => { page.result.current.loadMore(); });
  expect(page.result.current.recipes.map(r => r.id)).toEqual(['new-first', 'new-next']);
});
it('unmount cancels pending preload timers and late responses cannot schedule another page', async () => {
  const next = deferred(); vi.mocked(fetchRecipesFromAPI).mockReturnValueOnce(next.promise);
  const page = mount(); act(() => { page.result.current.loadMore(); }); page.unmount();
  await act(async () => { next.resolve(result('next', 10)); }); await tick(3000);
  expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1);
});
it('a complete initial list does not preload a nonexistent second page', async () => {
  const filters = {};
  const page = renderHook(() => useFilteredRecipes([{ id: 'only' }], { filters, searchQuery: '', initialTotalCount: 1 }));
  await tick(1000); expect(fetchRecipesFromAPI).not.toHaveBeenCalled(); expect(page.result.current.hasMore).toBe(false);
});
it('equivalent filter objects preserve the current page number after unrelated rerenders', async () => {
  vi.mocked(fetchRecipesFromAPI).mockResolvedValueOnce(result('second', 3));
  const page = renderHook(({ filters }) => useFilteredRecipes([{ id: 'first' }], { filters, searchQuery: '', initialTotalCount: 3 }), { initialProps: { filters: {} } });
  await act(async () => { page.result.current.loadMore(); }); page.rerender({ filters: {} });
  vi.mocked(fetchRecipesFromAPI).mockResolvedValueOnce(result('third', 3)); await act(async () => { page.result.current.loadMore(); });
  expect(vi.mocked(fetchRecipesFromAPI).mock.calls.map(([params]) => params?.page)).toEqual([2, 3]);
});
it('loadMore cannot append old-list pages while a new query is still debouncing', async () => {
  const filters = {};
  const page = renderHook(({ search }) => useFilteredRecipes([{ id: 'first' }], { filters, searchQuery: search, initialTotalCount: 2 }), { initialProps: { search: '' } });
  page.rerender({ search: 'coordination-debounce' }); act(() => { page.result.current.loadMore(); });
  expect(fetchRecipesFromAPI).not.toHaveBeenCalled();
  await tick(300); expect(fetchRecipesFromAPI).toHaveBeenCalledTimes(1); expect(vi.mocked(fetchRecipesFromAPI).mock.calls[0][0]?.page).toBe(1);
});
