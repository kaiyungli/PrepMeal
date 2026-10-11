// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import { usePlanDetailController } from '@/features/plans/hooks/usePlanDetailController';

const service = vi.hoisted(() => ({ getPlanDetail: vi.fn() }));
vi.mock('@/features/plans/services/getPlanDetail', () => service);
function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const token = vi.fn(async (): Promise<string | null> => 'synthetic-token');
const defaults: Parameters<typeof usePlanDetailController>[0] = {
  planId: 'qa-plan-a', isAuthenticated: true, userId: 'qa-user-a', getAccessToken: token };
function detail(id: string) {
  return { plan: { id, name: id, week_start_date: '2026-10-05', days_count: 2 },
    items: [{ id: 'qa-item', recipe_id: id + '-recipe', date: '2026-10-05', meal_type: 'dinner', servings: 2 }] };
}
type Detail = ReturnType<typeof detail>;
function mount() { return renderHook(props => usePlanDetailController(props), { initialProps: defaults }); }
async function flush() { await act(async () => {}); }
function expectEmpty(value: ReturnType<typeof usePlanDetailController>) {
  expect(value.plan).toBeNull(); expect(value.items).toEqual([]);
  expect(value.groupedItems).toEqual({}); expect(value.mealSlotGroupsByDay).toEqual({});
  expect(value.recipeIds).toEqual([]); expect(value.selectedRecipeId).toBeNull();
}
beforeEach(() => { service.getPlanDetail.mockReset(); token.mockReset().mockResolvedValue('synthetic-token'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('saved plan detail scope isolation', () => {
  it.each(['plan', 'account', 'logout', 'missing-plan', 'missing-user'] as const)('hides all old content immediately on %s transition', async change => {
    service.getPlanDetail.mockResolvedValueOnce(detail('qa-plan-a')).mockImplementation(() => new Promise(() => {}));
    const { result, rerender } = mount(); await flush();
    act(() => result.current.handleRecipeClick('qa-plan-a-recipe'));
    rerender({ ...defaults, planId: change === 'plan' ? 'qa-plan-b' : change === 'missing-plan' ? '' : defaults.planId,
      userId: change === 'account' ? 'qa-user-b' : change === 'missing-user' ? '' : defaults.userId,
      isAuthenticated: change !== 'logout' });
    expectEmpty(result.current); expect(result.current.loading).toBe(true); expect(result.current.error).toBeNull();
  });

  it.each(['success', 'failure'] as const)('late A %s does not end B loading or set B error', async outcome => {
    const a = deferred<Detail>(); const b = deferred<Detail>();
    service.getPlanDetail.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result, rerender } = mount(); await flush();
    rerender({ ...defaults, planId: 'qa-plan-b' }); await flush();
    await act(async () => { if (outcome === 'success') a.resolve(detail('qa-plan-a')); else a.reject(new Error('old error')); });
    expectEmpty(result.current); expect(result.current.loading).toBe(true); expect(result.current.error).toBeNull();
    await act(async () => { b.resolve(detail('qa-plan-b')); });
    expect(result.current.plan.id).toBe('qa-plan-b'); expect(result.current.loading).toBe(false);
  });

  it('B remains visible when A finishes last', async () => {
    const a = deferred<Detail>(); service.getPlanDetail.mockReturnValueOnce(a.promise).mockResolvedValueOnce(detail('qa-plan-b'));
    const { result, rerender } = mount(); await flush();
    rerender({ ...defaults, planId: 'qa-plan-b' }); await flush();
    await act(async () => { a.resolve(detail('qa-plan-a')); });
    expect(result.current.plan.id).toBe('qa-plan-b'); expect(result.current.recipeIds).toEqual(['qa-plan-b-recipe']);
  });

  it('never exposes a pre-logout plan during any render on same-account login', async () => {
    service.getPlanDetail.mockResolvedValueOnce(detail('qa-plan-a')).mockImplementation(() => new Promise(() => {}));
    const observed: Array<string | null> = [];
    const { rerender } = renderHook(props => {
      const controller = usePlanDetailController(props);
      observed.push(controller.plan?.id ?? null);
      return controller;
    }, { initialProps: defaults });
    await flush(); rerender({ ...defaults, isAuthenticated: false });
    observed.length = 0; rerender({ ...defaults });
    expect(observed.length).toBeGreaterThan(0); expect(observed.every(id => id === null)).toBe(true);
  });

  it('uses the refreshed token getter when a later plan is requested', async () => {
    service.getPlanDetail.mockResolvedValue(detail('qa-plan-a'));
    const { rerender } = mount(); await flush();
    const refreshed = vi.fn(async () => 'refreshed-synthetic-token');
    rerender({ ...defaults, getAccessToken: refreshed });
    rerender({ ...defaults, planId: 'qa-plan-b', getAccessToken: refreshed }); await flush();
    expect(service.getPlanDetail.mock.calls[1]).toEqual(['qa-plan-b', 'refreshed-synthetic-token']);
  });

  it('account B receives a fresh plan even with the same plan id', async () => {
    const pending = deferred<Detail>(); service.getPlanDetail.mockResolvedValueOnce(detail('account-A')).mockReturnValueOnce(pending.promise);
    const { result, rerender } = mount(); await flush();
    rerender({ ...defaults, userId: 'qa-user-b' }); expectEmpty(result.current);
    await act(async () => { pending.resolve(detail('account-B')); });
    expect(result.current.plan.id).toBe('account-B'); expect(service.getPlanDetail).toHaveBeenCalledTimes(2);
  });

  it.each(['plan', 'logout', 'unmount'] as const)('does not start obsolete API work after a delayed token and %s', async change => {
    const delayed = deferred<string | null>(); token.mockReturnValueOnce(delayed.promise);
    service.getPlanDetail.mockResolvedValue(detail('qa-plan-b'));
    const { result, rerender, unmount } = mount();
    if (change === 'plan') { rerender({ ...defaults, planId: 'qa-plan-b' }); await flush(); }
    else if (change === 'logout') rerender({ ...defaults, isAuthenticated: false }); else unmount();
    await act(async () => { delayed.resolve('synthetic-token'); });
    expect(service.getPlanDetail).toHaveBeenCalledTimes(change === 'plan' ? 1 : 0);
    if (change === 'plan') expect(result.current.plan.id).toBe('qa-plan-b');
  });

  it('keeps successful data and selection through a same-account token callback refresh', async () => {
    service.getPlanDetail.mockResolvedValue(detail('qa-plan-a'));
    const { result, rerender } = mount(); await flush();
    act(() => result.current.handleRecipeClick('qa-plan-a-recipe'));
    rerender({ ...defaults, getAccessToken: async () => 'refreshed-synthetic-token' }); await flush();
    expect(service.getPlanDetail).toHaveBeenCalledTimes(1); expect(result.current.selectedRecipeId).toBe('qa-plan-a-recipe');
  });

  it('does not resurrect old selection or cached A data after A→B→A', async () => {
    const a = deferred<Detail>(); service.getPlanDetail.mockResolvedValueOnce(detail('qa-plan-a'))
      .mockResolvedValueOnce(detail('qa-plan-b')).mockReturnValueOnce(a.promise);
    const { result, rerender } = mount(); await flush();
    act(() => result.current.handleRecipeClick('qa-plan-a-recipe'));
    rerender({ ...defaults, planId: 'qa-plan-b' }); await flush();
    rerender({ ...defaults }); expectEmpty(result.current);
    await act(async () => { a.resolve(detail('qa-plan-a')); });
    expect(result.current.selectedRecipeId).toBeNull(); expect(result.current.plan.id).toBe('qa-plan-a');
  });

  it('current failure clears old content and a new scope can recover', async () => {
    service.getPlanDetail.mockResolvedValueOnce(detail('qa-plan-a')).mockRejectedValueOnce(new Error('current error'))
      .mockResolvedValueOnce(detail('qa-plan-c'));
    const { result, rerender } = mount(); await flush();
    rerender({ ...defaults, planId: 'qa-plan-b' }); await flush();
    expectEmpty(result.current); expect(result.current.error).toBe('current error'); expect(result.current.loading).toBe(false);
    rerender({ ...defaults, planId: 'qa-plan-c' }); await flush();
    expect(result.current.error).toBeNull(); expect(result.current.plan.id).toBe('qa-plan-c');
  });

  it('missing token prevents an unauthenticated API request', async () => {
    token.mockResolvedValue(null); const { result } = mount(); await flush();
    expect(service.getPlanDetail).not.toHaveBeenCalled(); expectEmpty(result.current);
    expect(result.current.error).toBe('請先登入以查看餐單'); expect(result.current.loading).toBe(false);
  });

  it('null plan ends loading with empty items and no error', async () => {
    service.getPlanDetail.mockResolvedValue({ plan: null, items: [] }); const { result } = mount(); await flush();
    expectEmpty(result.current); expect(result.current.error).toBeNull(); expect(result.current.loading).toBe(false);
  });

  it('preserves repeated recipes, slots, day groups and saved servings', async () => {
    const data = detail('qa-plan-a');
    data.items.push({ ...data.items[0], id: 'qa-item-2', date: '2026-10-06', meal_type: 'lunch' });
    service.getPlanDetail.mockResolvedValue(data); const { result } = mount(); await flush();
    expect(result.current.recipeIds).toEqual(['qa-plan-a-recipe', 'qa-plan-a-recipe']); expect(result.current.avgServings).toBe(2);
    expect(Object.keys(result.current.groupedItems)).toEqual(['0', '1']);
    expect(result.current.mealSlotGroupsByDay[0][0].mealSlot).toBe('dinner');
    expect(result.current.mealSlotGroupsByDay[1][0].mealSlot).toBe('lunch');
  });

  it('StrictMode ignores its obsolete setup request and late work after unmount', async () => {
    const first = deferred<Detail>(); const second = deferred<Detail>();
    // Token resolution is deferred to the next microtask, so the first StrictMode setup must never call the API.
    service.getPlanDetail.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender, unmount } = renderHook(props => usePlanDetailController(props), { initialProps: defaults,
      wrapper: ({ children }) => createElement(StrictMode, null, children) }); await flush();
    expect(service.getPlanDetail).toHaveBeenCalledTimes(1);
    await act(async () => { first.resolve(detail('qa-plan-a')); }); expect(result.current.plan.id).toBe('qa-plan-a');
    rerender({ ...defaults, planId: 'qa-plan-b' }); await flush(); unmount();
    await act(async () => { second.resolve(detail('qa-plan-b')); }); expectEmpty(result.current);
  });
});
