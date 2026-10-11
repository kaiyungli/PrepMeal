// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import { useSavedPlanShoppingList, SHOPPING_LIST_LOAD_ERROR } from '@/features/plans/hooks/useSavedPlanShoppingList';

const auth = vi.hoisted(() => ({ user: { id: 'qa-user-a' } as { id: string } | null,
  isAuthenticated: true, getAccessToken: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
const fetchMock = vi.fn();
const defaults = { recipeIds: ['qa-a'], servings: 2 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function response(name: string, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => ({ pantry: [],
    toBuy: [{ category: 'egg', items: [{ name, quantity: 2, unit: 'pc' }] }],
    byRecipe: [{ recipeName: name, pantry: [], toBuy: [{ name }] }] }) } as Response;
}
function mount() { return renderHook(props => useSavedPlanShoppingList(props), { initialProps: defaults }); }
beforeEach(() => {
  auth.user = { id: 'qa-user-a' }; auth.isAuthenticated = true;
  auth.getAccessToken.mockReset().mockResolvedValue('synthetic-token');
  fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('saved plan shopping response isolation', () => {
  it('allows B to start while A is pending and ignores A resolving last', async () => {
    const a = deferred<Response>();
    fetchMock.mockReturnValueOnce(a.promise).mockResolvedValueOnce(response('B'));
    const { result, rerender } = mount();
    let old!: Promise<void>;
    await act(async () => { old = result.current.fetchShoppingList(); });
    rerender({ ...defaults, recipeIds: ['qa-b'] });
    await act(async () => { await result.current.fetchShoppingList(); });
    await act(async () => { a.resolve(response('A')); await old; });
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('B');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'failure'] as const)('old A %s cannot end B loading or set its error', async outcome => {
    const a = deferred<Response>(); const b = deferred<Response>();
    fetchMock.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result, rerender } = mount();
    let old!: Promise<void>; let current!: Promise<void>;
    await act(async () => { old = result.current.fetchShoppingList(); });
    rerender({ ...defaults, recipeIds: ['qa-b'] });
    await act(async () => { current = result.current.fetchShoppingList(); });
    await act(async () => { if (outcome === 'success') a.resolve(response('A')); else a.reject(new Error('old'));
      await old; });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull(); expect(result.current.shoppingList).toBeNull();
    await act(async () => { b.resolve(response('B')); await current; });
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('B');
  });

  it.each(['recipes', 'servings', 'occurrences', 'account', 'logout'] as const)('hides completed content immediately when %s changes', async change => {
    fetchMock.mockResolvedValue(response('private-A'));
    const { result, rerender } = mount();
    await act(async () => { await result.current.fetchShoppingList(); });
    if (change === 'account') auth.user = { id: 'qa-user-b' };
    if (change === 'logout') { auth.user = null; auth.isAuthenticated = false; }
    rerender({ recipeIds: change === 'recipes' ? ['qa-b'] : change === 'occurrences' ? ['qa-a', 'qa-a'] : ['qa-a'],
      servings: change === 'servings' ? 4 : 2 });
    expect(result.current.shoppingList).toBeNull();
    expect(result.current.loading).toBe(false); expect(result.current.error).toBeNull();
  });

  it.each(['scope', 'unmount'] as const)('does not fetch after a delayed token and %s change', async change => {
    const token = deferred<string | null>(); auth.getAccessToken.mockReturnValue(token.promise);
    const { result, rerender, unmount } = mount(); let old!: Promise<void>;
    act(() => { old = result.current.fetchShoppingList(); });
    if (change === 'unmount') unmount(); else rerender({ ...defaults, recipeIds: ['qa-b'] });
    await act(async () => { token.resolve('synthetic-token'); await old; });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores stale JSON after the HTTP response already arrived', async () => {
    const json = deferred<unknown>();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: () => json.promise })
      .mockResolvedValueOnce(response('B'));
    const { result, rerender } = mount(); let old!: Promise<void>;
    await act(async () => { old = result.current.fetchShoppingList(); });
    rerender({ ...defaults, recipeIds: ['qa-b'] });
    await act(async () => { await result.current.fetchShoppingList(); });
    await act(async () => { json.resolve(await response('A').json()); await old; });
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('B');
  });

  it('deduplicates concurrent calls despite equal fresh recipe arrays', async () => {
    const pending = deferred<Response>(); fetchMock.mockReturnValue(pending.promise);
    const { result, rerender } = mount(); let request!: Promise<void>;
    await act(async () => { request = result.current.fetchShoppingList(); });
    rerender({ ...defaults, recipeIds: ['qa-a'] });
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(response('A')); await request; });
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('A');
  });

  it('posts repeated recipes and clicked servings unchanged', async () => {
    fetchMock.mockResolvedValue(response('A'));
    const { result } = renderHook(() => useSavedPlanShoppingList({ recipeIds: ['qa-a', 'qa-b', 'qa-a'], servings: 4 }));
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ recipeIds: ['qa-a', 'qa-b', 'qa-a'], servings: 4 });
  });

  it.each(['HTTP', 'network', 'token'] as const)('clears a %s error and permits retry', async failure => {
    fetchMock.mockResolvedValueOnce(response('bad', false)).mockResolvedValueOnce(response('retried'));
    if (failure === 'network') fetchMock.mockReset().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response('retried'));
    if (failure === 'token') {
      auth.getAccessToken.mockRejectedValueOnce(new Error('token'));
      fetchMock.mockReset().mockResolvedValue(response('retried'));
    }
    const { result } = mount();
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(result.current.error).toBe(SHOPPING_LIST_LOAD_ERROR);
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(result.current.error).toBeNull(); expect(result.current.loading).toBe(false);
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('retried');
  });

  it('expired token shows sign-in error then allows retry', async () => {
    auth.getAccessToken.mockResolvedValueOnce(null); fetchMock.mockResolvedValue(response('retried'));
    const { result } = mount();
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(result.current.error).toBe('請先登入以查看購物清單'); expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('retried');
  });

  it('logout prevents token and API work even if a token remains available', async () => {
    auth.user = null; auth.isAuthenticated = false;
    const { result } = mount();
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(result.current.error).toBe('請先登入以查看購物清單');
    expect(auth.getAccessToken).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it('account B can load the same recipes while account A request remains pending', async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response('account-B'));
    const { result, rerender } = mount(); let old!: Promise<void>;
    await act(async () => { old = result.current.fetchShoppingList(); });
    auth.user = { id: 'qa-user-b' }; rerender({ ...defaults });
    await act(async () => { await result.current.fetchShoppingList(); });
    await act(async () => { pending.resolve(response('account-A')); await old; });
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('account-B');
  });

  it('aborts on unmount and works through StrictMode setup/cleanup', async () => {
    const pending = deferred<Response>(); fetchMock.mockResolvedValueOnce(response('strict')).mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useSavedPlanShoppingList(defaults),
      { wrapper: ({ children }) => createElement(StrictMode, null, children) });
    await act(async () => { await result.current.fetchShoppingList(); });
    expect(result.current.shoppingList?.byRecipe[0].recipeName).toBe('strict');
    let old!: Promise<void>;
    await act(async () => { old = result.current.fetchShoppingList(); });
    const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
    unmount(); expect(signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response('late')); await old; });
    expect(result.current.shoppingList).toBeNull();
  });
});
