// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, createElement, type ReactNode } from 'react';
import { useRecipeDetailPrefetch } from '@/features/recipes/hooks/useRecipeDetailPrefetch';
const { prefetch } = vi.hoisted(() => ({ prefetch: vi.fn().mockResolvedValue(null) }));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => ({ prefetchRecipeDetail: prefetch }));
const recipes = Array.from({ length: 10 }, (_, id) => ({ id: `recipe-${id}` }));
beforeEach(() => { vi.useFakeTimers(); prefetch.mockClear(); vi.stubGlobal('requestIdleCallback', undefined); vi.stubGlobal('cancelIdleCallback', undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const advance = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
it('keeps the initial delay, 250ms staggering and eight-item limit while mounted', async () => {
  renderHook(() => useRecipeDetailPrefetch(recipes));
  await advance(999); expect(prefetch).not.toHaveBeenCalled();
  await advance(2); expect(prefetch.mock.calls).toEqual([['recipe-0']]);
  await advance(2500); expect(prefetch.mock.calls.map(c => c[0])).toEqual(recipes.slice(0, 8).map(r => r.id));
});
it('unmount before the first batch cancels the fallback timer', async () => {
  const page = renderHook(() => useRecipeDetailPrefetch(recipes)); page.unmount();
  await advance(4000); expect(prefetch).not.toHaveBeenCalled();
});
it('leaving after the first preload prevents the remaining seven from starting', async () => {
  const page = renderHook(() => useRecipeDetailPrefetch(recipes));
  await advance(1001); expect(prefetch).toHaveBeenCalledTimes(1); page.unmount();
  await advance(4000); expect(prefetch).toHaveBeenCalledTimes(1);
});
it('an ID change retires the previous pending batch and starts only the new one', async () => {
  const page = renderHook(({ data }) => useRecipeDetailPrefetch(data), { initialProps: { data: recipes } });
  await advance(1001); page.rerender({ data: [{ id: 'new-recipe' }] });
  await advance(4000); expect(prefetch.mock.calls).toEqual([['recipe-0'], ['new-recipe']]);
});
it('identical IDs do not reschedule work on unrelated renders', async () => {
  const page = renderHook(({ data }) => useRecipeDetailPrefetch(data), { initialProps: { data: recipes } });
  await advance(1001); page.rerender({ data: recipes.map(r => ({ ...r })) });
  await advance(4000); expect(prefetch).toHaveBeenCalledTimes(8);
});
it('retired idle callbacks cannot schedule requests when cancelIdleCallback is absent', async () => {
  let idle!: IdleRequestCallback;
  vi.stubGlobal('requestIdleCallback', vi.fn((callback: IdleRequestCallback) => { idle = callback; return 7; }));
  const page = renderHook(() => useRecipeDetailPrefetch(recipes)); page.unmount();
  idle({ didTimeout: false, timeRemaining: () => 50 }); await advance(4000);
  expect(prefetch).not.toHaveBeenCalled();
});
it('cleans staggered timers after an idle callback has already run', async () => {
  let idle!: IdleRequestCallback;
  const cancel = vi.fn(); vi.stubGlobal('cancelIdleCallback', cancel);
  vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => { idle = callback; return 7; });
  const page = renderHook(() => useRecipeDetailPrefetch(recipes));
  idle({ didTimeout: false, timeRemaining: () => 50 }); await advance(1); page.unmount();
  await advance(4000); expect(prefetch).toHaveBeenCalledTimes(1); expect(cancel).toHaveBeenCalledWith(7);
});
it('StrictMode effect replay dispatches each preload only once', async () => {
  const wrapper = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);
  renderHook(() => useRecipeDetailPrefetch(recipes), { wrapper });
  await advance(4000); expect(prefetch).toHaveBeenCalledTimes(8);
});
