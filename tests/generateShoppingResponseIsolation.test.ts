// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import { useGenerateActions } from '@/features/generate/hooks/useGenerateActions';
import type { ShoppingListViewModel } from '@/features/shopping-list/types';

const service = vi.hoisted(() => ({ fetchGeneratedPlanShoppingList: vi.fn() }));
vi.mock('@/features/generate/services/fetchGeneratedPlanShoppingList', () => service);
vi.mock('@/features/generate/index', () => ({ normalizePlanForSave: vi.fn(), saveGeneratedPlan: vi.fn() }));
const planA = { mon: [{ id: 'qa-a' }] };
const planB = { mon: [{ id: 'qa-b' }] };
function view(id: string): ShoppingListViewModel {
  return { pantry: [], sections: [], byRecipe: [{ recipeId: id, recipeName: id, pantry: [], toBuy: [] }],
    summary: { pantryCount: 0, toBuyCount: 1, sectionCount: 0 }, isEmpty: false };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const token = vi.fn(async () => 'synthetic-test-token');
const defaults = { weeklyPlan: planA, pantryIngredients: [] as string[], servings: 2, daysPerWeek: 7,
  isAuthenticated: true, userId: 'qa-user-a' as string | null, getAccessToken: token };
function mount() { return renderHook(props => useGenerateActions(props), { initialProps: defaults }); }
beforeEach(() => { vi.clearAllMocks(); service.fetchGeneratedPlanShoppingList.mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Generate shopping list response isolation', () => {
  it('keeps list B when list A resolves last', async () => {
    const a = deferred<ShoppingListViewModel>();
    service.fetchGeneratedPlanShoppingList.mockReturnValueOnce(a.promise).mockResolvedValueOnce(view('qa-b'));
    const { result, rerender } = mount();
    let requestA!: Promise<void>;
    await act(async () => { requestA = result.current.handleOpenShoppingList(); });
    rerender({ ...defaults, weeklyPlan: planB });
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListView).toEqual(view('qa-b'));
    await act(async () => { a.resolve(view('qa-a')); await requestA; });
    expect(result.current.shoppingListView).toEqual(view('qa-b'));
  });

  it('does not restore a cleared list from a late response', async () => {
    const a = deferred<ShoppingListViewModel>();
    service.fetchGeneratedPlanShoppingList.mockReturnValueOnce(a.promise);
    const { result } = mount();
    let request!: Promise<void>;
    await act(async () => { request = result.current.handleOpenShoppingList(); });
    act(() => { result.current.handleClearAll(); });
    await act(async () => { a.resolve(view('qa-a')); await request; });
    expect(result.current.shoppingListView).toBeNull();
    expect(result.current.showShoppingList).toBe(false);
    expect(result.current.isShoppingListLoading).toBe(false);
  });

  it('never reuses account A memory cache for account B on the same plan', async () => {
    service.fetchGeneratedPlanShoppingList.mockResolvedValueOnce(view('account-a')).mockResolvedValueOnce(view('account-b'));
    const { result, rerender } = mount();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    rerender({ ...defaults, userId: 'qa-user-b' });
    expect(result.current.shoppingListView).toBeNull();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListView).toEqual(view('account-b'));
    expect(service.fetchGeneratedPlanShoppingList.mock.calls[1][3].cacheScope).toBe('qa-user-b');
  });

  it.each(['resolve', 'reject'] as const)('obsolete A %s cannot change B loading or error', async outcome => {
    const a = deferred<ShoppingListViewModel>();
    const b = deferred<ShoppingListViewModel>();
    service.fetchGeneratedPlanShoppingList.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result, rerender } = mount();
    let requestA!: Promise<void>;
    let requestB!: Promise<void>;
    await act(async () => { requestA = result.current.handleOpenShoppingList(); });
    rerender({ ...defaults, weeklyPlan: planB });
    await act(async () => { requestB = result.current.handleOpenShoppingList(); });
    await act(async () => {
      if (outcome === 'resolve') a.resolve(view('qa-a'));
      else a.reject(new Error('obsolete A error'));
      await requestA;
    });
    expect(result.current.isShoppingListLoading).toBe(true);
    expect(result.current.shoppingListError).toBeNull();
    expect(result.current.shoppingListView).toBeNull();
    await act(async () => { b.resolve(view('qa-b')); await requestB; });
    expect(result.current.shoppingListView).toEqual(view('qa-b'));
  });

  it.each<[string, Partial<typeof defaults>]>([
    ['servings', { servings: 4 }],
    ['pantry', { pantryIngredients: ['qa-egg'] }],
    ['repeat occurrences', { weeklyPlan: { mon: [{ id: 'qa-a' }, { id: 'qa-a' }] } }],
  ])('invalidates a completed cache when %s changes', async (_label, change) => {
    service.fetchGeneratedPlanShoppingList.mockResolvedValueOnce(view('old')).mockResolvedValueOnce(view('new'));
    const { result, rerender } = mount();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    rerender({ ...defaults, ...change });
    expect(result.current.shoppingListView).toBeNull();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListView).toEqual(view('new'));
    expect(service.fetchGeneratedPlanShoppingList).toHaveBeenCalledTimes(2);
  });

  it('ignores a late preload after a foreground request completes', async () => {
    const a = deferred<ShoppingListViewModel>();
    service.fetchGeneratedPlanShoppingList.mockReturnValueOnce(a.promise).mockResolvedValueOnce(view('foreground'));
    const { result } = mount();
    let preload!: Promise<void>;
    await act(async () => { preload = result.current.preloadShoppingList(); });
    await act(async () => { await result.current.handleOpenShoppingList(); });
    await act(async () => { a.resolve(view('old-preload')); await preload; });
    expect(result.current.shoppingListView).toEqual(view('foreground'));
    expect(result.current.isShoppingListLoading).toBe(false);
  });

  it('reuses a successful preload for the matching scope', async () => {
    service.fetchGeneratedPlanShoppingList.mockResolvedValueOnce(view('preloaded'));
    const { result } = mount();
    await act(async () => { await result.current.preloadShoppingList(); });
    expect(result.current.showShoppingList).toBe(false);
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.showShoppingList).toBe(true);
    expect(result.current.shoppingListView).toEqual(view('preloaded'));
    expect(service.fetchGeneratedPlanShoppingList).toHaveBeenCalledTimes(1);
  });

  it('retries an error without leaving the old error above successful content', async () => {
    service.fetchGeneratedPlanShoppingList.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce(view('retried'));
    const { result } = mount();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListError).toBe('temporary failure');
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListError).toBeNull();
    expect(result.current.shoppingListView).toEqual(view('retried'));
  });

  it('close invalidates pending work and reopening requests a fresh list', async () => {
    const a = deferred<ShoppingListViewModel>();
    service.fetchGeneratedPlanShoppingList.mockReturnValueOnce(a.promise).mockResolvedValueOnce(view('fresh'));
    const { result } = mount();
    let request!: Promise<void>;
    await act(async () => { request = result.current.handleOpenShoppingList(); });
    act(() => { result.current.handleCloseShoppingList(); });
    await act(async () => { a.resolve(view('closed')); await request; });
    expect(result.current.shoppingListView).toBeNull();
    expect(result.current.isShoppingListLoading).toBe(false);
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListView).toEqual(view('fresh'));
  });

  it('logout hides cached content and prevents authenticated service calls', async () => {
    service.fetchGeneratedPlanShoppingList.mockResolvedValueOnce(view('private'));
    const { result, rerender } = mount();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    rerender({ ...defaults, isAuthenticated: false, userId: null });
    expect(result.current.shoppingListView).toBeNull();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListError).toBe('請先登入以查看購物清單');
    expect(service.fetchGeneratedPlanShoppingList).toHaveBeenCalledTimes(1);
  });

  it.each(['clear', 'unmount', 'scope-change'] as const)('does not start a fetch after a delayed token lookup and %s', async action => {
    const pendingToken = deferred<string | null>();
    const { result, rerender, unmount } = renderHook(props => useGenerateActions(props),
      { initialProps: { ...defaults, getAccessToken: () => pendingToken.promise } });
    let request!: Promise<void>;
    act(() => { request = result.current.handleOpenShoppingList(); });
    if (action === 'clear') act(() => { result.current.handleClearAll(); });
    else if (action === 'unmount') unmount();
    else rerender({ ...defaults, weeklyPlan: planB, getAccessToken: () => pendingToken.promise });
    await act(async () => { pendingToken.resolve('synthetic-test-token'); await request; });
    expect(service.fetchGeneratedPlanShoppingList).not.toHaveBeenCalled();
  });

  it('copies only the current list and cannot copy cached content after logout', async () => {
    const writeText = vi.fn<Navigator['clipboard']['writeText']>().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const currentView = { ...view('qa-b'), sections: [{ categoryKey: 'vegetable' as const,
      categoryLabel: '蔬菜', categoryIcon: '🥬', items: [{ ingredientId: 'qa-b', name: 'B-only ingredient',
        quantityText: '2 克', quantityPending: false }] }] };
    service.fetchGeneratedPlanShoppingList.mockResolvedValueOnce(currentView);
    const { result, rerender } = mount();
    await act(async () => { await result.current.handleOpenShoppingList(); });
    await act(async () => { await result.current.handleCopyShoppingList(); });
    expect(writeText.mock.calls[0]?.[0]).toContain('B-only ingredient');
    rerender({ ...defaults, isAuthenticated: false, userId: null });
    await act(async () => { await result.current.handleCopyShoppingList(); });
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('works after StrictMode setup/cleanup and ignores a response after unmount', async () => {
    const pending = deferred<ShoppingListViewModel>();
    service.fetchGeneratedPlanShoppingList.mockResolvedValueOnce(view('strict')).mockReturnValueOnce(pending.promise);
    const { result, rerender, unmount } = renderHook(props => useGenerateActions(props), { initialProps: defaults,
      wrapper: ({ children }) => createElement(StrictMode, null, children) });
    await act(async () => { await result.current.handleOpenShoppingList(); });
    expect(result.current.shoppingListView).toEqual(view('strict'));
    rerender({ ...defaults, weeklyPlan: planB });
    let request!: Promise<void>;
    await act(async () => { request = result.current.handleOpenShoppingList(); });
    unmount();
    await act(async () => { pending.resolve(view('late')); await request; });
    expect(result.current.shoppingListView).toBeNull();
  });
});
