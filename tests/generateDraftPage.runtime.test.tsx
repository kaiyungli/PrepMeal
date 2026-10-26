import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GeneratePage from '@/pages/generate';
import { draftKey, encodeDraft, parseDraft, type DraftSnapshot } from '@/features/generate/draftStore';

const state = vi.hoisted(() => ({ user: { id: 'A' } as { id: string } | null, loading: false, notice: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user, loading: state.loading, isAuthenticated: !!state.user, getAccessToken: async () => 'test-token' }) }));
vi.mock('next/router', () => ({ useRouter: () => ({ isReady: true, query: {} }) }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Footer', () => ({ default: () => null }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({ useHeaderController: () => ({}) }));
vi.mock('@/components/RecipeDetailModal', () => ({ default: () => null }));
vi.mock('@/components/ShoppingListModal', () => ({ default: () => null }));
vi.mock('@/components/ui/Toast', () => ({ default: () => null, useToast: () => ({ toast: null, showToast: state.notice }) }));
vi.mock('@/features/generate/services/fetchAvailableRecipes', () => ({ fetchAvailableRecipes: async () => [{
  id: 'a', name: '帳戶A晚餐', meal_role: 'complete_meal', is_complete_meal: true, cuisine: 'chinese',
  protein: ['chicken'], primary_protein: 'chicken', diet: [], flavor: [], total_time_minutes: 20,
}] }));
const snapshot: DraftSnapshot = { weeklyPlan: { mon: ['a'] }, lockedSlots: { 'mon-0': true }, notices: [],
  preferences: { daysPerWeek: 3, dailyComposition: 'complete_meal', servings: 4, allowCompleteMeal: true,
    budget: 'normal', ingredientReuse: 'normal', exclusions: [], filters: { cuisine: [], dish_type: [], protein: [], method: [], speed: [], difficulty: [], diet: [], flavor: [] } } };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); state.user = { id: 'A' }; state.loading = false;
  localStorage.setItem(draftKey('user:A'), encodeDraft('user:A', snapshot));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('real generate page draft integration', () => {
  it('rehydrates the real controller and page, including servings and lock', async () => {
    render(<GeneratePage />);
    await waitFor(() => expect(screen.getAllByText('帳戶A晚餐').length).toBeGreaterThan(0));
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('4');
    expect(screen.getByRole('button', { name: '解鎖' })).toBeTruthy();
    expect(screen.getByText(/已還原草稿/)).toBeTruthy();
    expect(screen.getByText(/除已鎖定菜式外，目前有 0 道可用完整餐，尚需安排 2 個完整餐位/)).toBeTruthy();
    expect(screen.getAllByText('欠一道完整餐')).toHaveLength(2);
  });

  it('fills just the selected gap and updates its persistent role label and supply warning', async () => {
    render(<GeneratePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: '解鎖' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '第二天第1道：添加完整餐' }));
    expect(screen.getAllByText('帳戶A晚餐')).toHaveLength(2);
    expect(screen.getAllByText('欠一道完整餐')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '解鎖' })).toBeTruthy();
    // Unlocking changes the next generation's demand without changing the plan.
    fireEvent.click(screen.getByRole('button', { name: '解鎖' }));
    expect(screen.getByText(/目前有 1 道可用完整餐，尚需安排 3 個完整餐位/)).toBeTruthy();
    expect(screen.getAllByText('帳戶A晚餐')).toHaveLength(2);
  });

  it('hides A data immediately when switching accounts or logging out', async () => {
    const { rerender } = render(<GeneratePage />);
    await waitFor(() => expect(screen.getAllByText('帳戶A晚餐').length).toBeGreaterThan(0));
    state.user = { id: 'B' }; rerender(<GeneratePage />);
    expect(screen.queryByText('帳戶A晚餐')).toBeNull();
    await waitFor(() => expect(screen.getByText('已選擇 0 餐')).toBeTruthy());
    state.user = null; rerender(<GeneratePage />);
    expect(screen.queryByText('帳戶A晚餐')).toBeNull();
  });

  it('requires confirmation before clearing and persists the confirmed empty draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<GeneratePage />);
    await waitFor(() => expect(screen.getAllByText('帳戶A晚餐').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: '🗑️ 清空' }));
    expect(screen.getAllByText('帳戶A晚餐').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '🗑️ 清空' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByText('帳戶A晚餐')).toBeNull());
    const stored = parseDraft(localStorage.getItem(draftKey('user:A')), 'user:A');
    expect(stored.status).toBe('ok');
    if (stored.status === 'ok') expect(Object.values(stored.draft.snapshot.weeklyPlan).flat().filter(Boolean)).toEqual([]);
  });
});
