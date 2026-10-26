import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useGenerateDraft } from '@/features/generate/hooks/useGenerateDraft';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { DRAFT_TTL, TRANSFER_KEY, draftKey, encodeDraft, parseDraft, type DraftSnapshot } from '@/features/generate/draftStore';

const router = vi.hoisted(() => ({ isReady: true, query: {} as Record<string, string> }));
vi.mock('next/router', () => ({ useRouter: () => router }));
const recipes = [{ id: 'a', name: 'fresh name' }, { id: 'b', name: 'second meal' }];
const saved: DraftSnapshot = {
  weeklyPlan: { mon: ['a', null, 'b'] }, lockedSlots: { 'mon-0': true }, notices: [],
  preferences: { daysPerWeek: 3, dailyComposition: 'two_meat_one_veg', servings: 4, allowCompleteMeal: false,
    budget: 'budget', ingredientReuse: 'normal', exclusions: ['chicken'], filters: { cuisine: ['japanese'], dish_type: [], protein: [], method: [], speed: [], difficulty: [], diet: [], flavor: [] } },
};
function useWorkspace(userId: string | null, loadingRecipes = false) {
  const preferences = useGeneratePreferences();
  const [weeklyPlan, setWeeklyPlan] = useState<Record<string, ({ id: string | number; [key: string]: unknown } | null)[]>>({});
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});
  const draft = useGenerateDraft({ userId, allRecipes: recipes, loadingRecipes, recipesError: null,
    preferences, weeklyPlan, lockedSlots, setWeeklyPlan, setLockedSlots });
  return { draft, preferences, weeklyPlan, setWeeklyPlan, lockedSlots, setLockedSlots };
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); router.query = {}; router.isReady = true; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('draft lifecycle', () => {
  it('waits for catalogue before restoring; reload preserves meals, gaps, settings and locks', async () => {
    const { result, unmount } = renderHook(() => useWorkspace(null));
    act(() => {
      result.current.setWeeklyPlan({ mon: [recipes[0], null, recipes[1]] });
      result.current.setLockedSlots({ 'mon-0': true });
      result.current.preferences.setServings(4);
      result.current.preferences.setFilters((previous: Record<string, string[]>) => ({ ...previous, cuisine: ['japanese'] }));
    });
    expect(result.current.draft.message).toContain('草稿已自動保存');
    unmount();
    const restored = renderHook(({ loading }) => useWorkspace(null, loading), { initialProps: { loading: true } });
    expect(restored.result.current.draft.ready).toBe(false);
    expect(restored.result.current.weeklyPlan).toEqual({});
    restored.rerender({ loading: false });
    expect(restored.result.current.weeklyPlan.mon).toEqual([recipes[0], null, recipes[1]]);
    expect(restored.result.current.lockedSlots).toEqual({ 'mon-0': true });
    expect(restored.result.current.preferences.servings).toBe(4);
    expect(restored.result.current.preferences.filters.cuisine).toEqual(['japanese']);
  });

  it('does not refresh the seven-day expiry merely by opening the draft', () => {
    const raw = encodeDraft('guest', saved, Date.now() - 1000);
    localStorage.setItem(draftKey('guest'), raw);
    renderHook(() => useWorkspace(null));
    expect(localStorage.getItem(draftKey('guest'))).toBe(raw);
  });

  it('shows expired and unavailable recipes without silently substituting a meal', () => {
    localStorage.setItem(draftKey('guest'), encodeDraft('guest', saved, Date.now() - DRAFT_TTL));
    const expired = renderHook(() => useWorkspace(null));
    expect(expired.result.current.draft.message).toContain('超過7日');
    expect(expired.result.current.weeklyPlan).toEqual({}); expired.unmount();
    localStorage.setItem(draftKey('guest'), encodeDraft('guest', { ...saved, weeklyPlan: { tue: ['retired'] }, lockedSlots: { 'tue-0': true } }));
    const missing = renderHook(() => useWorkspace(null));
    expect(missing.result.current.weeklyPlan.tue).toEqual([null]);
    expect(missing.result.current.lockedSlots).toEqual({});
    expect(missing.result.current.draft.notices[0]).toContain('星期二第1道');
  });

  it('separates guest and account drafts; normal sign-in never inherits another owner', () => {
    localStorage.setItem(draftKey('user:A'), encodeDraft('user:A', saved));
    localStorage.setItem(draftKey('guest'), encodeDraft('guest', { ...saved, weeklyPlan: { mon: ['b'] } }));
    const a = renderHook(() => useWorkspace('A'));
    expect(a.result.current.weeklyPlan.mon[0]?.id).toBe('a'); a.unmount();
    const b = renderHook(() => useWorkspace('B'));
    expect(b.result.current.weeklyPlan).toEqual({}); b.unmount();
    const guest = renderHook(() => useWorkspace(null));
    expect(guest.result.current.weeklyPlan.mon[0]?.id).toBe('b');
  });

  it('transfers only the matching same-tab guest login handoff, then consumes it', () => {
    const guest = renderHook(() => useWorkspace(null));
    act(() => {
      guest.result.current.setWeeklyPlan({ mon: [recipes[1]] });
      guest.result.current.draft.setShoppingProgress({ version: 1, items: {}, extras: [{ id: 'shopping-x', name: '紙巾', quantity: '2', unit: '包', checked: true, note: '實機測試' }] });
    });
    const redirect = guest.result.current.draft.prepareLogin(); guest.unmount();
    router.query = { resumeDraft: new URL(redirect, 'https://example.com').searchParams.get('resumeDraft')! };
    const signedIn = renderHook(() => useWorkspace('A'));
    expect(signedIn.result.current.weeklyPlan.mon[0]?.id).toBe('b');
    expect(signedIn.result.current.draft.shoppingProgress.extras[0]).toMatchObject({ name: '紙巾', checked: true, note: '實機測試' });
    expect(sessionStorage.getItem(TRANSFER_KEY)).toBeNull();
    expect(localStorage.getItem(draftKey('guest'))).toBeNull();
    expect(parseDraft(localStorage.getItem(draftKey('user:A')), 'user:A').status).toBe('ok');
    signedIn.unmount();
    const differentAccount = renderHook(() => useWorkspace('B'));
    expect(differentAccount.result.current.weeklyPlan).toEqual({});
  });

  it('ignores mismatched, expired and foreign-tab handoff markers', () => {
    sessionStorage.setItem(TRANSFER_KEY, JSON.stringify({ nonce: 'real', createdAt: Date.now(), draft: encodeDraft('guest', saved) }));
    router.query = { resumeDraft: 'wrong' };
    const wrong = renderHook(() => useWorkspace('A'));
    expect(wrong.result.current.weeklyPlan).toEqual({}); wrong.unmount();
    router.query = { resumeDraft: 'real' };
    sessionStorage.setItem(TRANSFER_KEY, JSON.stringify({ nonce: 'real', createdAt: Date.now() - 31 * 60 * 1000, draft: encodeDraft('guest', saved) }));
    const expired = renderHook(() => useWorkspace('A'));
    expect(expired.result.current.weeklyPlan).toEqual({}); expired.unmount();
    sessionStorage.clear();
    const otherTab = renderHook(() => useWorkspace('A'));
    expect(otherTab.result.current.weeklyPlan).toEqual({});
  });

  it('pauses cross-tab writes until the user chooses the remote draft', () => {
    const { result } = renderHook(() => useWorkspace(null));
    act(() => result.current.setWeeklyPlan({ mon: [recipes[0]] }));
    const remote = encodeDraft('guest', { ...saved, weeklyPlan: { mon: ['b'] } });
    localStorage.setItem(draftKey('guest'), remote);
    act(() => window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage, key: draftKey('guest'), newValue: remote })));
    expect(result.current.draft.conflict).toBe(true);
    act(() => result.current.setWeeklyPlan({ mon: [recipes[0], recipes[0]] }));
    expect(localStorage.getItem(draftKey('guest'))).toBe(remote);
    act(() => result.current.draft.resolveConflict(false));
    expect(result.current.weeklyPlan.mon[0]?.id).toBe('b');
    expect(result.current.draft.conflict).toBe(false);
  });

  it('reports unavailable storage without claiming successful autosave', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useWorkspace(null));
    act(() => result.current.setWeeklyPlan({ mon: [recipes[0]] }));
    expect(result.current.draft.message).toContain('保存失敗');
    expect(() => result.current.draft.prepareLogin()).toThrow('quota');
  });
});
