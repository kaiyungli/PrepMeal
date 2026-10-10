// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useRecipeDetailModal } from '@/features/recipes/hooks/useRecipeDetailModal';

type Recipe = { id: string; name: string; ingredients?: { name: string }[]; steps?: string[] };
const cache = vi.hoisted(() => ({
  getCachedRecipeDetail: vi.fn(), getInflightRecipeDetail: vi.fn(), setCachedRecipeDetail: vi.fn(),
}));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => cache);
const fetchMock = vi.fn<typeof fetch>();
const a: Recipe = { id: 'qa-a', name: 'A' };
const b: Recipe = { id: 'qa-b', name: 'B' };
const detailA: Recipe = { ...a, ingredients: [{ name: 'A-only ingredient' }], steps: ['A step'] };
const detailB: Recipe = { ...b, ingredients: [{ name: 'B-only ingredient' }], steps: ['B step'] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = (recipe: Recipe) => new Response(JSON.stringify({ recipe }), { status: 200 });
function mount(selected: Recipe | null = a) {
  const onClose = vi.fn();
  return { onClose, ...renderHook(({ recipe }) => useRecipeDetailModal(recipe, { onClose }), {
    initialProps: { recipe: selected },
  }) };
}
beforeEach(() => {
  vi.resetAllMocks();
  cache.getCachedRecipeDetail.mockReturnValue(null);
  cache.getInflightRecipeDetail.mockReturnValue(null);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('recipe preview response isolation', () => {
  it('keeps cached B after closing A when shared prefetch A resolves late', async () => {
    const pendingA = deferred<Recipe>();
    cache.getInflightRecipeDetail.mockImplementation(id => id === a.id ? pendingA.promise : null);
    cache.getCachedRecipeDetail.mockImplementation(id => id === b.id ? detailB : null);
    const { result, rerender, onClose } = mount();
    act(() => result.current.close());
    rerender({ recipe: b });
    expect(result.current.recipe).toEqual(detailB);
    await act(async () => { pendingA.resolve(detailA); });
    expect(result.current.recipe).toEqual(detailB);
    expect(result.current.loading).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(['resolve', 'reject'] as const)('obsolete shared prefetch %s does not change B or its loading/error', async outcome => {
    const pendingA = deferred<Recipe>();
    const pendingB = deferred<Recipe>();
    cache.getInflightRecipeDetail.mockImplementation(id => id === a.id ? pendingA.promise : pendingB.promise);
    const { result, rerender } = mount();
    rerender({ recipe: b });
    await act(async () => {
      if (outcome === 'resolve') pendingA.resolve(detailA);
      else pendingA.reject(new Error('obsolete A failure'));
    });
    expect(result.current.recipe).toEqual(b);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await act(async () => { pendingB.resolve(detailB); });
    expect(result.current.recipe).toEqual(detailB);
    expect(result.current.loading).toBe(false);
  });

  it('late direct fetch cannot overwrite cached B or populate the cache after close', async () => {
    const pendingA = deferred<Response>();
    fetchMock.mockReturnValue(pendingA.promise); // Deliberately ignores abort, as queued callbacks may do.
    cache.getCachedRecipeDetail.mockImplementation(id => id === b.id ? detailB : null);
    const { result, rerender } = mount();
    const signal = fetchMock.mock.calls[0][1]?.signal;
    act(() => result.current.close());
    expect(signal?.aborted).toBe(true);
    rerender({ recipe: b });
    await act(async () => { pendingA.resolve(response(detailA)); });
    expect(result.current.recipe).toEqual(detailB);
    expect(cache.setCachedRecipeDetail).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)('obsolete direct fetch %s cannot clear B loading or add an error', async outcome => {
    const pendingA = deferred<Response>();
    const pendingB = deferred<Response>();
    fetchMock.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);
    const { result, rerender } = mount();
    const signalA = fetchMock.mock.calls[0][1]?.signal;
    rerender({ recipe: b });
    expect(signalA?.aborted).toBe(true);
    await act(async () => {
      if (outcome === 'resolve') pendingA.resolve(response(detailA));
      else pendingA.reject(new Error('obsolete A failure'));
    });
    expect(result.current.recipe).toEqual(b);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await act(async () => { pendingB.resolve(response(detailB)); });
    expect(result.current.recipe).toEqual(detailB);
    expect(cache.setCachedRecipeDetail).toHaveBeenCalledTimes(1);
    expect(cache.setCachedRecipeDetail).toHaveBeenCalledWith(b.id, detailB);
  });

  it('closing invalidates a prefetch immediately, even before the parent clears selection', async () => {
    const pending = deferred<Recipe>();
    cache.getInflightRecipeDetail.mockReturnValue(pending.promise);
    const { result } = mount();
    act(() => result.current.close());
    await act(async () => { pending.resolve(detailA); });
    expect(result.current.recipe).toEqual(a);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reopening the same ID does not accept the previous opening response', async () => {
    const first = deferred<Recipe>();
    const second = deferred<Recipe>();
    cache.getInflightRecipeDetail.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = mount();
    act(() => result.current.close());
    rerender({ recipe: null });
    rerender({ recipe: a });
    await act(async () => { first.resolve(detailA); });
    expect(result.current.recipe).toEqual(a);
    expect(result.current.loading).toBe(true);
    await act(async () => { second.resolve({ ...detailA, name: 'Fresh A' }); });
    expect(result.current.recipe.name).toBe('Fresh A');
  });

  it('switching to full-detail B clears A error and does not fetch', async () => {
    const pending = deferred<Recipe>();
    cache.getInflightRecipeDetail.mockImplementation(id => id === a.id ? pending.promise : null);
    const { result, rerender } = mount();
    await act(async () => { pending.reject(new Error('A failed')); });
    expect(result.current.error).toBe('A failed');
    rerender({ recipe: detailB });
    expect(result.current.recipe).toEqual(detailB);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clearing selection aborts direct fetch and clears state', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    const { result, rerender } = mount();
    const signal = fetchMock.mock.calls[0][1]?.signal;
    rerender({ recipe: null });
    expect(signal?.aborted).toBe(true);
    await act(async () => { pending.resolve(response(detailA)); });
    expect(result.current.recipe).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('unmount aborts direct fetch and prevents its late cache write', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    const { unmount } = mount();
    const signal = fetchMock.mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => { pending.resolve(response(detailA)); });
    expect(cache.setCachedRecipeDetail).not.toHaveBeenCalled();
  });

  it('current direct fetch still reports errors and finishes loading', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = mount();
    await act(async () => {});
    expect(result.current.recipe).toEqual(a);
    expect(result.current.error).toBe('Failed to fetch recipe detail: HTTP 500');
    expect(result.current.loading).toBe(false);
  });
});
