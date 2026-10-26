import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import LoginPage from '@/pages/login';
import ShoppingListModal from '@/components/ShoppingListModal';
import ShoppingListDrawer from '@/components/shopping/ShoppingListDrawer';
import { useGenerateData } from '@/features/generate/hooks/useGenerateData';

const mocks = vi.hoisted(() => ({ oauth: vi.fn(), email: vi.fn(), fetchRecipes: vi.fn(), push: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: mocks.push }) }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({ useHeaderController: () => ({}) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, loading: false, isAuthenticated: false,
  signInWithGoogle: mocks.oauth, signInWithApple: mocks.oauth, signInWithFacebook: mocks.oauth }) }));
vi.mock('@/lib/supabase', () => ({ default: { auth: { signInWithPassword: mocks.email } } }));
vi.mock('@/components', () => ({
  Input: ({ label, onChange, ...props }: any) => <label>{label}<input {...props} onChange={e => onChange(e.target.value)} /></label>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock('@/features/generate/index', () => ({ fetchAvailableRecipes: mocks.fetchRecipes }));
vi.mock('@/components/shopping/OptionalIngredientChoices', () => ({ default: () => null }));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); });

describe('core reliability', () => {
  it.each(['Google', 'Apple', 'Facebook'])('unlocks %s login after provider failure and allows retry', async provider => {
    let reject!: (reason: Error) => void;
    mocks.oauth.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce({});
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: `使用 ${provider} 登入` }));
    expect(screen.getByRole('button', { name: /^登入$/ }).hasAttribute('disabled')).toBe(true);
    await act(async () => reject(new Error('provider failed')));
    expect(screen.getByText('provider failed')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: `使用 ${provider} 登入` })));
    expect(mocks.oauth).toHaveBeenCalledTimes(2);
  });

  it('blocks same-tick duplicate email submits while waiting for authentication', async () => {
    let resolve!: (result: object) => void;
    mocks.email.mockImplementation(() => new Promise(done => { resolve = done; }));
    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'qa@example.com' } });
    fireEvent.change(screen.getByLabelText('密碼'), { target: { value: 'test-only' } });
    act(() => { fireEvent.submit(container.querySelector('form')!); fireEvent.submit(container.querySelector('form')!); });
    expect(mocks.email).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ error: null }));
    expect(mocks.push).toHaveBeenCalledTimes(1);
  });

  it('does not report copied while pending or denied, and offers selectable fallback text', async () => {
    let resolve!: (success: boolean) => void;
    const onCopy = vi.fn(() => new Promise<boolean>(done => { resolve = done; }));
    const view: any = { pantry: [], sections: [{ categoryKey: 'vegetables', items: [{ name: '洋蔥', quantityText: '2個' }] }], byRecipe: [], summary: { pantryCount: 0, toBuyCount: 1, sectionCount: 1 }, isEmpty: false };
    render(<ShoppingListModal isOpen onClose={() => {}} shoppingListView={view} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: '📋 複製清單' }));
    expect(screen.queryByText('✅ 已複製!')).toBeNull();
    await act(async () => resolve(false));
    expect(screen.getByLabelText('清單文字')).toBeTruthy();
    expect(screen.queryByText('✅ 已複製!')).toBeNull();
  });

  it('exposes a failed catalogue request and recovers on retry', async () => {
    mocks.fetchRecipes.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ id: 'a' }]);
    const { result } = renderHook(() => useGenerateData());
    await act(async () => {});
    expect(result.current.recipesError).toContain('重試');
    await act(async () => result.current.retryRecipes());
    expect(result.current.recipesError).toBeNull();
    expect(result.current.allRecipes).toEqual([{ id: 'a' }]);
  });

  it('contains drawer focus, closes with Escape and restores the trigger', () => {
    const close = vi.fn();
    const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
    const { rerender } = render(<ShoppingListDrawer isOpen onClose={close} shoppingList={null} loading={false} error="offline" onFetch={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: '購物清單' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect((document.activeElement as HTMLElement).textContent).toBe('重試');
    fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledTimes(1);
    rerender(<ShoppingListDrawer isOpen={false} onClose={close} shoppingList={null} loading={false} error={null} onFetch={() => {}} />);
    expect(document.activeElement).toBe(trigger); trigger.remove();
  });
});
