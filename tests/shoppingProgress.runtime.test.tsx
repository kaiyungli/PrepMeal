import { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShoppingListV2 from '@/components/shopping/ShoppingListV2';
import { useSavedShoppingProgress } from '@/features/shopping-list/progress/useSavedShoppingProgress';
import { emptyProgress, type ShoppingProgress } from '@/features/shopping-list/progress/model';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
const auth = vi.hoisted(() => ({ user: { id: 'A' }, getAccessToken: vi.fn(async () => 'token') }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/components/shopping/OptionalIngredientChoices', () => ({ default: () => null }));
const view = mapShoppingListResponseToViewModel({ pantry: [], toBuy: [{ category: 'meat', items: [{ ingredientId: 'chicken', name: '雞肉', normalizedName: 'chicken', quantity: 200, unit: 'g', category: 'meat', source: 'recipe_ingredients', quantityPending: false }] }], byRecipe: [{ recipeId: 'a', recipeName: '雞飯', pantry: [], toBuy: [{ ingredientId: 'chicken', name: '雞肉', quantity: 200, unit: 'g' }] }], summary: { pantryCount: 0, toBuyCount: 1, sectionCount: 1 } });
function Workspace() { const [progress, setProgress] = useState(emptyProgress); return <ShoppingListV2 view={view} progress={progress} onChange={setProgress} />; }
beforeEach(() => { auth.user.id = 'A'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const response = (body: unknown, status=200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
describe('shopping UI and cloud save', () => {
  it('checks, hides bought, adds/edits extras and shares remaining or all with notes', async () => {
    const writeText = vi.fn(async (_text: string) => {}); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<Workspace />);
    expect(screen.queryByLabelText('雞肉 採購備註')).toBeNull();
    expect(screen.queryByLabelText('物品名稱')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '編輯 雞肉' }));
    fireEvent.change(screen.getByLabelText('雞肉 採購備註'), { target: { value: '街市' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /雞肉/ }));
    expect(screen.getByText('已買 1／共 1 項')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /雞肉/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '已買 1 項' }));
    expect(screen.getByRole('checkbox', { name: /雞肉/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '已買 1 項' }));
    fireEvent.click(screen.getByRole('button', { name: '＋ 加入物品' }));
    expect(screen.queryByLabelText('雞肉 採購備註')).toBeNull();
    fireEvent.change(screen.getByLabelText('物品名稱'), { target: { value: '紙巾' } });
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('單位'), { target: { value: '包' } });
    fireEvent.click(screen.getByRole('button', { name: '加入物品' }));
    fireEvent.click(screen.getByRole('button', { name: '分享' }));
    fireEvent.click(screen.getByRole('button', { name: '複製清單' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('紙巾 2 包'); expect(writeText.mock.calls[0][0]).not.toContain('雞肉');
    await waitFor(() => expect(screen.getByText('已複製清單')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('分享範圍'), { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: '複製清單' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0]).toContain('☑ 雞肉 200 g — 街市');
  });
  it('shows selectable text when clipboard fails and handles share cancellation', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => { throw new Error(); }) } });
    render(<Workspace />); fireEvent.click(screen.getByRole('button', { name: '分享' })); fireEvent.click(screen.getByRole('button', { name: '複製清單' }));
    await waitFor(() => expect(screen.getByLabelText('清單文字')).toBeTruthy());
  });
  it('undoes a purchase without losing a note, and cancels unsaved editor changes', async () => {
    render(<Workspace />);
    const edit = screen.getByRole('button', { name: '編輯 雞肉' });
    edit.focus();
    fireEvent.click(edit);
    expect(document.activeElement).toBe(screen.getByLabelText('雞肉 採購備註'));
    fireEvent.change(screen.getByLabelText('雞肉 採購備註'), { target: { value: '未保存' } });
    fireEvent.click(screen.getByRole('button', { name: '‹ 返回清單' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '編輯 雞肉' }));
    expect(screen.queryByText('未保存')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /雞肉/ }));
    fireEvent.click(screen.getByRole('button', { name: '撤銷' }));
    expect((screen.getByRole('checkbox', { name: /雞肉/ }) as HTMLInputElement).checked).toBe(false);
  });
  it('edits/deletes extras through details, keeps purchase checks shared across views', () => {
    render(<Workspace />);
    fireEvent.click(screen.getByRole('button', { name: '＋ 加入物品' }));
    fireEvent.change(screen.getByLabelText('物品名稱'), { target: { value: '紙巾' } });
    fireEvent.click(screen.getByRole('button', { name: '加入物品' }));
    fireEvent.click(screen.getByRole('button', { name: '編輯 紙巾' }));
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    fireEvent.click(screen.getByRole('button', { name: '編輯 紙巾' }));
    fireEvent.click(screen.getByRole('button', { name: '刪除物品' }));
    expect(screen.queryByRole('checkbox', { name: /紙巾/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('清單排列'), { target: { value: 'recipe' } });
    expect(screen.getByText('雞飯')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /雞肉/ }));
    fireEvent.change(screen.getByLabelText('清單排列'), { target: { value: 'category' } });
    expect(screen.queryByRole('checkbox', { name: /雞肉/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '已買 1 項' }));
    expect((screen.getByRole('checkbox', { name: /雞肉/ }) as HTMLInputElement).checked).toBe(true);
  });
  it('does not turn a cancelled native share into a success notice', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: vi.fn(async () => { throw new DOMException('cancelled', 'AbortError'); }) });
    render(<Workspace />);
    fireEvent.click(screen.getByRole('button', { name: '分享' }));
    fireEvent.click(screen.getByRole('button', { name: '分享清單' }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('已開啟分享。')).toBeNull();
  });
  it('serializes rapid writes, keeping the latest edit and new server revision', async () => {
    let resolveFirst!: (value: Response) => void;
    const fetch = vi.fn().mockImplementationOnce(() => response({ progress: null, revision: 0 }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => response({ revision: 2 })); vi.stubGlobal('fetch', fetch);
    const hook = renderHook(() => useSavedShoppingProgress('plan', true));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    const p: ShoppingProgress = { ...emptyProgress(), extras: [{ id: 'x', name: '牛奶', quantity: '1', unit: '樽', note: '', checked: false }] };
    act(() => hook.result.current.change(p));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    act(() => hook.result.current.change({ ...p, extras: [{ ...p.extras[0], checked: true }] }));
    await act(async () => resolveFirst(new Response(JSON.stringify({ revision: 1 }))));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    const sent = JSON.parse(fetch.mock.calls[2][1].body);
    expect(sent.revision).toBe(1); expect(sent.progress.extras[0].checked).toBe(true);
    await waitFor(() => expect(hook.result.current.status).toContain('已保存'));
  });
  it('stops on conflicts, reloads explicitly and hides another account response', async () => {
    const fetch = vi.fn().mockImplementationOnce(() => response({ progress: emptyProgress(), revision: 3 }))
      .mockImplementationOnce(() => response({}, 409)).mockImplementationOnce(() => response({ progress: emptyProgress(), revision: 4 })); vi.stubGlobal('fetch', fetch);
    const hook = renderHook(() => useSavedShoppingProgress('plan', true));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    act(() => hook.result.current.change(emptyProgress()));
    await waitFor(() => expect(hook.result.current.conflict).toBe(true));
    expect(hook.result.current.ready).toBe(false);
    await act(async () => hook.result.current.reload());
    expect(hook.result.current.conflict).toBe(false); expect(hook.result.current.ready).toBe(true);
  });
});
