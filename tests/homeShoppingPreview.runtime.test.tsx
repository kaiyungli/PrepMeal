import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { useShoppingListPreview } from '@/hooks/useShoppingListPreview';
import { useHomePageController } from '@/features/home/hooks/useHomePageController';
import HomeHero from '@/components/home/HomeHero';

const auth = vi.hoisted(() => ({
  user: { id: 'qa-user' } as { id: string } | null,
  getAccessToken: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useUserState', () => ({
  useUserState: () => ({ isAuthenticated: true, isFavorite: () => false, toggleFavorite: vi.fn() }),
}));
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const plan = [{ items: [{ recipeId: 'recipe-a' }] }];
const response = (items = [{ name: '測試洋蔥', quantity: 2, unit: 'g' }]) => ({
  ok: true, json: async () => ({ toBuy: [{ category: '蔬菜', items }] }),
});
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  auth.user = { id: 'qa-user' };
  auth.getAccessToken.mockReset().mockResolvedValue('test-token');
  fetchMock = vi.fn().mockResolvedValue(response());
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('homepage shopping preview', () => {
  it('is lazy, then marks a populated result initialized', async () => {
    const { result } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(false);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.previewList).toEqual([{ name: '測試洋蔥', qty: '2', unit: 'g' }]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).recipeIds).toEqual(['recipe-a']);
  });

  it('distinguishes a successful empty result from not loaded', async () => {
    fetchMock.mockResolvedValue(response([]));
    const { result } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.previewList).toEqual([]);
  });

  it('handles an empty plan without an API call', async () => {
    const emptyPlan: typeof plan = [];
    const { result } = renderHook(() => useShoppingListPreview(emptyPlan, { enabled: false }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isInitialized).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('has a stable empty default plan across renders', async () => {
    const { result, rerender } = renderHook(() => useShoppingListPreview(undefined, { enabled: false }));
    await act(async () => { await result.current.refresh(); });
    rerender();
    expect(result.current.isInitialized).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['no-user', 'no-token'])('shows auth-required without fetching: %s', async (mode) => {
    if (mode === 'no-user') auth.user = null;
    else auth.getAccessToken.mockResolvedValue(null);
    const { result } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isAuthRequired).toBe(true);
    expect(result.current.isInitialized).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows retry after failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const { result } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.error).toContain('500');
    expect(result.current.isInitialized).toBe(false);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.error).toBeNull();
    expect(result.current.isInitialized).toBe(true);
  });

  it('deduplicates clicks while the token is pending', async () => {
    let resolveToken!: (token: string) => void;
    auth.getAccessToken.mockImplementation(() => new Promise<string>(resolve => { resolveToken = resolve; }));
    const { result } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    let pending: Promise<void> | undefined;
    act(() => { pending = result.current.refresh(); result.current.refresh(); });
    expect(auth.getAccessToken).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);
    await act(async () => { resolveToken('token'); await pending; });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears successful data when the plan or account changes', async () => {
    const { result, rerender } = renderHook(({ currentPlan }) => useShoppingListPreview(currentPlan, { enabled: false }), { initialProps: { currentPlan: plan } });
    await act(async () => { await result.current.refresh(); });
    rerender({ currentPlan: [{ items: [{ recipeId: 'recipe-b' }] }] });
    expect(result.current.previewList).toEqual([]);
    expect(result.current.isInitialized).toBe(false);
    await act(async () => { await result.current.refresh(); });
    auth.user = null;
    rerender({ currentPlan: plan });
    expect(result.current.previewList).toEqual([]);
    expect(result.current.isInitialized).toBe(false);
  });

  it('ignores an old response after refreshing the plan, even after a newer response succeeds', async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void;
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(({ currentPlan }) => useShoppingListPreview(currentPlan, { enabled: false }), { initialProps: { currentPlan: plan } });
    let oldRequest: Promise<void> | undefined;
    await act(async () => { oldRequest = result.current.refresh(); });
    rerender({ currentPlan: [{ items: [{ recipeId: 'recipe-b' }] }] });
    await act(async () => { await result.current.refresh(); });
    await act(async () => { resolveOld(response([{ name: '舊食材', quantity: 1, unit: 'g' }])); await oldRequest; });
    expect(result.current.previewList[0].name).toBe('測試洋蔥');
    expect(result.current.isInitialized).toBe(true);
  });

  it('does not send an old request if the account changes while obtaining its token', async () => {
    let resolveToken!: (token: string) => void;
    auth.getAccessToken.mockImplementation(() => new Promise<string>(resolve => { resolveToken = resolve; }));
    const { result, rerender } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    let pending: Promise<void> | undefined;
    act(() => { pending = result.current.refresh(); });
    auth.user = null;
    rerender();
    await act(async () => { resolveToken('old-token'); await pending; });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(false);
  });

  it('retains debounced auto-fetch mode', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useShoppingListPreview(plan));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isInitialized).toBe(true);
  });

  it('renders real controller state through HomeHero on mouse and keyboard activation', async () => {
    const recipes = [{ id: 'recipe-a', name: '測試食譜' }];
    function Harness() {
      const controller = useHomePageController({ planRecipes: recipes });
      return <HomeHero {...controller} onRefreshPlan={controller.handleRefreshPlan} onRefreshShoppingList={controller.refreshShoppingList} />;
    }
    render(<Harness />);
    const button = screen.getByText('點擊載入').closest('[role="button"]')!;
    await act(async () => { fireEvent.keyDown(button, { key: 'Enter' }); });
    expect(screen.getByText('測試洋蔥')).toBeTruthy();
    expect(screen.queryByText('點擊載入')).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '刷新本週餐單' })); });
    expect(screen.queryByText('測試洋蔥')).toBeNull();
    fetchMock.mockResolvedValue(response([]));
    await act(async () => { fireEvent.click(screen.getByText('點擊載入')); });
    expect(screen.getByText('無需購買')).toBeTruthy();
  });

  it('threads both initialized and authentication state through the actual homepage', () => {
    const source = readFileSync('src/pages/index.js', 'utf8');
    expect(source).toContain('shoppingListInitialized={shoppingListInitialized}');
    expect(source).toContain('isAuthRequired={isAuthRequired}');
  });

  it('blocks mouse and keyboard activation while loading, and permits retry after an error', () => {
    const refresh = vi.fn();
    const { rerender } = render(<HomeHero shoppingLoading onRefreshShoppingList={refresh} />);
    const button = screen.getByText('載入中...').closest('[role="button"]')!;
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(refresh).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-busy')).toBe('true');
    rerender(<HomeHero shoppingError="test error" onRefreshShoppingList={refresh} />);
    fireEvent.keyDown(screen.getAllByText('未生成').at(-1)!.closest('[role="button"]')!, { key: ' ' });
    expect(refresh).toHaveBeenCalledTimes(1);
    rerender(<HomeHero isAuthRequired onRefreshShoppingList={refresh} />);
    expect(screen.getByText('登入後可見')).toBeTruthy();
  });

  it('limits the preview to five items without changing API aggregation', async () => {
    fetchMock.mockResolvedValue(response(Array.from({ length: 7 }, (_, n) => ({ name: `食材${n}`, quantity: n, unit: 'g' }))));
    const { result } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.previewList).toHaveLength(5);
    expect(result.current.previewList[0].qty).toBe('0');
  });

  it('ignores a response body that finishes after logout', async () => {
    let resolveBody!: (data: object) => void;
    fetchMock.mockResolvedValue({ ok: true, json: () => new Promise(resolve => { resolveBody = resolve; }) });
    const { result, rerender } = renderHook(() => useShoppingListPreview(plan, { enabled: false }));
    let pending: Promise<void> | undefined;
    await act(async () => { pending = result.current.refresh(); });
    auth.user = null;
    rerender();
    await act(async () => { resolveBody({ toBuy: [{ items: [{ name: '舊食材' }] }] }); await pending; });
    expect(result.current.previewList).toEqual([]);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
