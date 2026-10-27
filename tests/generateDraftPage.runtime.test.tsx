import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GeneratePage from '@/pages/generate';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';
import { draftKey, encodeDraft, parseDraft, type DraftSnapshot } from '@/features/generate/draftStore';

const state = vi.hoisted(() => ({ user: { id: 'A' } as { id: string } | null, loading: false, notice: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user, loading: state.loading, isAuthenticated: !!state.user, getAccessToken: async () => 'test-token' }) }));
vi.mock('next/router', () => ({ useRouter: () => ({ isReady: true, query: {} }) }));
vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => children }));
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
  it('renders public purpose and steps on the server while auth is unresolved, without reading a private draft', () => {
    state.loading = true;
    const readStorage = vi.spyOn(Storage.prototype, 'getItem');
    const html = renderToString(<GeneratePage />);
    expect(html).toContain('先安排幾日晚餐，再集中一至兩次買餸');
    expect(html).toContain('揀日數同人數');
    expect(html).toContain('保存到帳戶需登入');
    expect(html).toContain('<title>一週晚餐餐單生成器 | 今晚食乜</title>');
    expect(html).toContain('rel="canonical" href="https://eatwhathk.com/generate"');
    expect(html).toContain('name="description"');
    expect(html).not.toContain('noindex');
    expect(html).not.toContain('帳戶A晚餐');
    expect(html).not.toContain('一鍵生成');
    expect(readStorage).not.toHaveBeenCalled();
  });

  it('keeps public content visible and unmounts private controls while auth is checked again', async () => {
    const { rerender } = render(<GeneratePage />);
    await waitFor(() => expect(screen.getAllByText('帳戶A晚餐').length).toBeGreaterThan(0));
    state.loading = true;
    rerender(<GeneratePage />);
    expect(screen.getByRole('heading', { name: '一週餐單', level: 1 })).toBeTruthy();
    expect(screen.getByRole('list', { name: '安排餐單步驟' })).toBeTruthy();
    expect(screen.queryByText('帳戶A晚餐')).toBeNull();
    expect(screen.queryByRole('button', { name: /^保存$/ })).toBeNull();
    state.user = null; state.loading = false;
    rerender(<GeneratePage />);
    await waitFor(() => expect(screen.getByText('已選擇 0 餐')).toBeTruthy());
    expect(screen.queryByText('帳戶A晚餐')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('rehydrates the real controller and page, including servings and lock', async () => {
    render(<GeneratePage />);
    await waitFor(() => expect(screen.getAllByText('帳戶A晚餐').length).toBeGreaterThan(0));
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('4');
    expect(screen.getByRole('button', { name: '解鎖' })).toBeTruthy();
    expect(screen.getByText(/已還原草稿/)).toBeTruthy();
    expect(screen.getByText(/除已鎖定菜式外，只有 0 道可用完整餐，不足以填滿 2 個完整餐位/)).toBeTruthy();
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
    expect(screen.getByText(/只有 1 道可用完整餐，不足以填滿 3 個完整餐位/)).toBeTruthy();
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
