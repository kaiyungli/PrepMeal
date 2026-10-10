// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import { useGenerateActions } from '@/features/generate/hooks/useGenerateActions';

vi.mock('@/features/generate/index', () => ({ normalizePlanForSave: vi.fn(), saveGeneratedPlan: vi.fn() }));
vi.mock('@/features/generate/services/fetchGeneratedPlanShoppingList', () => ({ fetchGeneratedPlanShoppingList: vi.fn() }));
const fetchMock = vi.fn<typeof fetch>();
const a = { id: 'qa-a', name: 'A' };
const b = { id: 'qa-b', name: 'B' };
const detail = (recipe: typeof a) => ({ ...recipe, ingredients: [{ name: recipe.name + ' ingredient' }], steps: [{ text: recipe.name + ' step' }] });
const response = (recipe: typeof a) => new Response(JSON.stringify({ recipe: detail(recipe) }), { status: 200 });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mount() {
  return renderHook(() => useGenerateActions({ weeklyPlan: {}, pantryIngredients: [], servings: 2,
    daysPerWeek: 7, isAuthenticated: false, userId: null, getAccessToken: async () => null }));
}
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Generate recipe response isolation', () => {
  it('keeps B when the earlier A request resolves last', async () => {
    const pendingA = deferred<Response>();
    fetchMock.mockReturnValueOnce(pendingA.promise).mockResolvedValueOnce(response(b));
    const { result } = mount();
    let requestA!: Promise<void>;
    act(() => { requestA = result.current.handleRecipeClick(a); });
    await act(async () => { await result.current.handleRecipeClick(b); });
    expect(result.current.selectedRecipe).toEqual(detail(b));
    await act(async () => { pendingA.resolve(response(a)); await requestA; });
    expect(result.current.selectedRecipe).toEqual(detail(b));
    expect(result.current.modalLoading).toBe(false);
  });

  it('does not reopen a closed preview after the request finishes', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const { result } = mount();
    let request!: Promise<void>;
    act(() => { request = result.current.handleRecipeClick(a); });
    act(() => { result.current.handleCloseRecipe(); });
    await act(async () => { pending.resolve(response(a)); await request; });
    expect(result.current.selectedRecipe).toBeNull();
    expect(result.current.modalLoading).toBe(false);
  });

  it('does not reopen a preview after clearing the meal plan', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const { result } = mount();
    let request!: Promise<void>;
    act(() => { request = result.current.handleRecipeClick(a); });
    act(() => { result.current.handleClearAll(); });
    await act(async () => { pending.resolve(response(a)); await request; });
    expect(result.current.selectedRecipe).toBeNull();
    expect(result.current.modalLoading).toBe(false);
  });

  it.each(['resolve', 'reject'] as const)('obsolete A %s cannot end B loading', async outcome => {
    const pendingA = deferred<Response>();
    const pendingB = deferred<Response>();
    fetchMock.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = mount();
    let requestA!: Promise<void>;
    let requestB!: Promise<void>;
    act(() => { requestA = result.current.handleRecipeClick(a); requestB = result.current.handleRecipeClick(b); });
    await act(async () => {
      if (outcome === 'resolve') pendingA.resolve(response(a));
      else pendingA.reject(new Error('obsolete failure'));
      await requestA;
    });
    expect(result.current.modalLoading).toBe(true);
    expect(result.current.selectedRecipe).toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
    await act(async () => { pendingB.resolve(response(b)); await requestB; });
    expect(result.current.selectedRecipe).toEqual(detail(b));
    expect(result.current.modalLoading).toBe(false);
  });

  it('a cached B selection cancels pending A and finishes loading immediately', async () => {
    const pendingA = deferred<Response>();
    fetchMock.mockResolvedValueOnce(response(b)).mockReturnValueOnce(pendingA.promise);
    const { result } = mount();
    await act(async () => { await result.current.handleRecipeClick(b); });
    act(() => { result.current.handleCloseRecipe(); });
    let requestA!: Promise<void>;
    act(() => { requestA = result.current.handleRecipeClick(a); });
    await act(async () => { await result.current.handleRecipeClick(b); });
    expect(result.current.modalLoading).toBe(false);
    expect(result.current.selectedRecipe).toEqual(detail(b));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1]?.signal as AbortSignal).aborted).toBe(true);
    await act(async () => { pendingA.resolve(response(a)); await requestA; });
    expect(result.current.selectedRecipe).toEqual(detail(b));
    // An obsolete A response must not enter the local detail cache.
    fetchMock.mockResolvedValueOnce(response(a));
    await act(async () => { await result.current.handleRecipeClick(a); });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('ignores old JSON parsing after closing and reopening the same ID', async () => {
    const pendingJson = deferred<{ recipe: ReturnType<typeof detail> }>();
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => pendingJson.promise } as Response)
      .mockResolvedValueOnce(response(a));
    const { result } = mount();
    let request!: Promise<void>;
    await act(async () => { request = result.current.handleRecipeClick(a); });
    act(() => { result.current.handleCloseRecipe(); });
    await act(async () => { await result.current.handleRecipeClick(a); });
    await act(async () => { pendingJson.resolve({ recipe: { ...detail(a), name: 'obsolete A' } }); await request; });
    expect(result.current.selectedRecipe).toEqual(detail(a));
    expect(result.current.modalLoading).toBe(false);
  });

  it.each(['wrong-id', 'http-error'] as const)('rejects %s responses without caching them', async kind => {
    fetchMock.mockResolvedValueOnce(kind === 'wrong-id' ? response(b) : new Response(JSON.stringify({ recipe: detail(a) }), { status: 500 }));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = mount();
    await act(async () => { await result.current.handleRecipeClick(a); });
    expect(result.current.selectedRecipe).toBeNull();
    expect(result.current.modalLoading).toBe(false);
    expect(errorLog).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(response(a));
    await act(async () => { await result.current.handleRecipeClick(a); });
    expect(result.current.selectedRecipe).toEqual(detail(a));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts on unmount and remains usable after StrictMode setup/cleanup', async () => {
    const pending = deferred<Response>();
    fetchMock.mockResolvedValueOnce(response(b)).mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useGenerateActions({ weeklyPlan: {}, pantryIngredients: [],
      servings: 2, daysPerWeek: 7, isAuthenticated: false, userId: null, getAccessToken: async () => null }),
    { wrapper: ({ children }) => createElement(StrictMode, null, children) });
    await act(async () => { await result.current.handleRecipeClick(b); });
    expect(result.current.selectedRecipe).toEqual(detail(b));
    let request!: Promise<void>;
    act(() => { request = result.current.handleRecipeClick(a); });
    const signal = fetchMock.mock.calls[1][1]?.signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response(a)); await request; });
  });
});
