// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGenerateActions } from '@/features/generate/hooks/useGenerateActions';
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/features/generate/index', async () => ({
  ...(await import('@/features/generate/mappers/normalizePlanForSave')), saveGeneratedPlan: mocks.save,
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const options = { weeklyPlan: { mon: [{ id: 'qa-a' }, null], tue: [{ id: 'qa-a' }] } as Record<string, Array<{ id: string } | null>>,
  pantryIngredients: [], servings: 2, daysPerWeek: 3, isAuthenticated: true, userId: 'qa-user',
  getAccessToken: vi.fn(async (): Promise<string | null> => 'synthetic-test-token') };
function mount() { return renderHook(props => useGenerateActions(props), { initialProps: options }); }
beforeEach(() => {
  vi.useFakeTimers();
  mocks.save.mockReset().mockResolvedValue({ success: true });
  options.getAccessToken.mockReset().mockResolvedValue('synthetic-test-token');
  vi.stubGlobal('alert', vi.fn());
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Generate save single-flight', () => {
  it('blocks rapid clicks throughout token retrieval, including a retained callback', async () => {
    const token = deferred<string | null>();
    options.getAccessToken.mockReturnValueOnce(token.promise);
    const { result } = mount();
    const savedCallback = result.current.handleSave;
    let first!: Promise<void>;
    act(() => { first = savedCallback(); });
    expect(result.current.isSaving).toBe(true);
    await act(async () => { await savedCallback(); await result.current.handleSave(); });
    expect(options.getAccessToken).toHaveBeenCalledTimes(1);
    await act(async () => { token.resolve('synthetic-test-token'); await first; });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
  });

  it('blocks same-tick clicks while the save API is pending', async () => {
    const pending = deferred<{ success: boolean }>();
    mocks.save.mockReturnValueOnce(pending.promise);
    const { result } = mount();
    const callback = result.current.handleSave;
    let first!: Promise<void>;
    await act(async () => { first = callback(); });
    await act(async () => { await callback(); await result.current.handleSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(true);
    await act(async () => { pending.resolve({ success: true }); await first; });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveNotice).toContain('已保存餐單');
  });

  it('releases the lock after success so a later deliberate save still works', async () => {
    const { result } = mount();
    await act(async () => { await result.current.handleSave(); });
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(result.current.isSaving).toBe(false);
  });

  it('handles token lookup rejection and permits retry without making an initial save', async () => {
    options.getAccessToken.mockRejectedValueOnce(new Error('token lookup failed'));
    const { result } = mount();
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('保存失敗: token lookup failed');
    expect(result.current.isSaving).toBe(false);
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it.each(['returned-error', 'rejection'] as const)('releases the lock after API %s', async kind => {
    if (kind === 'returned-error') mocks.save.mockResolvedValueOnce({ success: false, error: 'save failed' });
    else mocks.save.mockRejectedValueOnce(new Error('save failed'));
    const { result } = mount();
    await act(async () => { await result.current.handleSave(); });
    expect(alert).toHaveBeenCalledWith('保存失敗: save failed');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveNotice).not.toContain('已保存餐單');
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(2);
  });

  it('does not lock or request a token for an empty plan', async () => {
    const { result, rerender } = mount();
    rerender({ ...options, weeklyPlan: { mon: [null], tue: [null] } });
    await act(async () => { await result.current.handleSave(); });
    expect(options.getAccessToken).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('No meal plan to save');
    expect(result.current.isSaving).toBe(false);
    rerender(options);
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it('keeps the clicked plan snapshot including repeated recipes and null slots', async () => {
    const token = deferred<string | null>();
    options.getAccessToken.mockReturnValueOnce(token.promise);
    const { result, rerender } = mount();
    let first!: Promise<void>;
    act(() => { first = result.current.handleSave(); });
    rerender({ ...options, servings: 4, weeklyPlan: { mon: [{ id: 'qa-b' }], tue: [null] } });
    await act(async () => { await result.current.handleSave(); });
    await act(async () => { token.resolve('synthetic-test-token'); await first; });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0].items).toEqual([
      { day_index: 0, meal_type: 'dinner', recipe_id: 'qa-a', servings: 2 },
      { day_index: 1, meal_type: 'dinner', recipe_id: 'qa-a', servings: 2 },
    ]);
  });

  it('clearing the draft does not release the lock of an already submitted save', async () => {
    const pending = deferred<{ success: boolean }>();
    mocks.save.mockReturnValueOnce(pending.promise);
    const { result } = mount();
    let first!: Promise<void>;
    await act(async () => { first = result.current.handleSave(); });
    act(() => { result.current.handleClearAll(); });
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ success: true }); await first; });
  });

  it('releases the lock after an expired token and preserves the login redirect', async () => {
    options.getAccessToken.mockResolvedValueOnce(null);
    const { result } = mount();
    const testWindow = Object.create(window);
    const location = { pathname: '/generate', href: '' };
    Object.defineProperty(testWindow, 'location', { value: location });
    vi.stubGlobal('window', testWindow);
    await act(async () => { await result.current.handleSave(); });
    expect(alert).toHaveBeenCalledWith('登入狀態已失效，請重新登入');
    expect(location.href).toBe('/login?redirect=%2Fgenerate');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
    await act(async () => { await result.current.handleSave(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it('redirects a signed-out user without requesting a token or saving', async () => {
    const { result, rerender } = mount();
    rerender({ ...options, isAuthenticated: false });
    const testWindow = Object.create(window);
    const location = { pathname: '/generate', href: '' };
    Object.defineProperty(testWindow, 'location', { value: location });
    vi.stubGlobal('window', testWindow);
    await act(async () => { await result.current.handleSave(); });
    expect(location.href).toBe('/login?redirect=%2Fgenerate');
    expect(options.getAccessToken).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });
});
