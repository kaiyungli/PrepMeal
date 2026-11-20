import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import Help from '@/pages/account-help';
import Reset from '@/components/auth/ResetPassword';
import Callback from '@/pages/auth/callback';
import { beginRecoveryAttempt, recordRecoveryEvent, clearRecoverySession } from '@/features/auth/recoverySession';
const state = vi.hoisted(() => ({ routerReady: true, query: {} as Record<string, string>, session: { user: { id: 'A' } },
  user: { id: 'A' }, authChange: null as null | ((event: string, session: { user: { id: string } } | null) => void), getUser: vi.fn(), replace: vi.fn(), reset: vi.fn(), resend: vi.fn(), update: vi.fn(), signOut: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: () => ({ isReady: state.routerReady, query: state.query, replace: state.replace, push: state.replace }) }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('@/components/layout/Layout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/lib/supabase', () => ({ default: { auth: {
  resetPasswordForEmail: state.reset, resend: state.resend, updateUser: state.update, signOut: state.signOut,
  getSession: async () => ({ data: { session: state.session }, error: null }),
  getUser: state.getUser,
  onAuthStateChange: (callback: (event: string, session: { user: { id: string } } | null) => void) => { state.authChange = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
} } }));
beforeEach(() => {
  vi.useRealTimers(); sessionStorage.clear(); clearRecoverySession(); state.routerReady = true; state.query = {}; state.user = { id: 'A' };
  state.getUser.mockReset().mockImplementation(async () => ({ data: { user: state.user }, error: null }));
  state.session = { user: { id: 'A' } }; state.replace.mockReset(); state.reset.mockReset(); state.resend.mockReset(); state.update.mockReset(); state.signOut.mockReset();
  state.reset.mockResolvedValue({ error: null }); state.resend.mockResolvedValue({ error: null }); state.update.mockResolvedValue({ error: null }); state.signOut.mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('enables the real submit button after SSR with an unready router hydrates with a ready router', async () => {
  state.routerReady = false;
  const container = document.createElement('div');
  container.innerHTML = renderToString(<Help />);
  document.body.appendChild(container);
  expect(container.querySelector('button')?.disabled).toBe(true);
  state.routerReady = true;
  let root!: ReturnType<typeof hydrateRoot>;
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await act(async () => { root = hydrateRoot(container, <Help />); });
    const button = container.querySelector('button')!;
    expect(button.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    await act(async () => { fireEvent.click(button); });
    expect(state.reset).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    if (root) await act(async () => root.unmount());
    container.remove(); errors.mockRestore();
  }
});
it('sends a reset request once, keeps the destination same-origin and starts cooldown', async () => {
  let resolve!: (value: unknown) => void;
  state.reset.mockReturnValue(new Promise(done => { resolve = done; }));
  const { container } = render(<Help />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  fireEvent.submit(container.querySelector('form')!); fireEvent.submit(container.querySelector('form')!);
  expect(state.reset).toHaveBeenCalledTimes(1);
  expect(new URL(state.reset.mock.calls[0][1].redirectTo).pathname).toBe('/auth/callback');
  await act(async () => resolve({ error: null }));
  expect(screen.getByRole('status').textContent).toContain('如該地址');
  expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
});
it('resends only signup confirmation and keeps generic account-safe failures retryable after cooldown', async () => {
  state.query = { mode: 'resend', redirect: '/generate?draft=1' }; state.resend.mockResolvedValue({ error: { status: 429, message: 'private info' } });
  const { container } = render(<Help />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('太密'));
  expect(new URL(state.resend.mock.calls[0][0].options.emailRedirectTo).searchParams.get('redirect')).toBe('/generate?draft=1');
  expect(screen.getByRole('link', { name: '忘記密碼' }).getAttribute('href')).toContain('redirect=%2Fgenerate%3Fdraft%3D1');
  expect(state.resend.mock.calls[0][0].type).toBe('signup'); expect(state.reset).not.toHaveBeenCalled();
  expect(screen.queryByText('private info')).toBeNull();
});
it('does not allow a normally logged-in session to open the password form', async () => {
  render(<Reset />); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('無效'));
  expect(screen.queryByLabelText('新密碼')).toBeNull(); expect(state.update).not.toHaveBeenCalled();
});
it('rejects an error link even when a previous recovery session exists', async () => {
  recordRecoveryEvent('PASSWORD_RECOVERY', 'A'); window.history.replaceState({}, '', '/auth/callback?flow=recovery#error=access_denied');
  render(<Reset />); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('無效'));
  expect(window.location.hash).toBe('');
});
it('validates matching passwords, submits once, clears fields and reports saved even if signout fails', async () => {
  window.history.replaceState({}, '', '/auth/callback?flow=recovery'); recordRecoveryEvent('PASSWORD_RECOVERY', 'A');
  let resolve!: (value: unknown) => void; state.update.mockReturnValue(new Promise(done => { resolve = done; }));
  state.signOut.mockRejectedValue(new Error('offline'));
  const { container } = render(<Reset />); await screen.findByLabelText('新密碼');
  fireEvent.change(screen.getByLabelText('新密碼'), { target: { value: 'test-password-123' } });
  fireEvent.change(screen.getByLabelText('再次輸入新密碼'), { target: { value: 'different' } });
  fireEvent.submit(container.querySelector('form')!); expect(screen.getByRole('alert').textContent).toContain('不一致');
  fireEvent.change(screen.getByLabelText('再次輸入新密碼'), { target: { value: 'test-password-123' } });
  fireEvent.submit(container.querySelector('form')!); fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
  await act(async () => resolve({ error: null }));
  expect(screen.getByRole('status').textContent).toContain('密碼已更新'); expect(screen.queryByLabelText('新密碼')).toBeNull();
});
it('stops if the account changed before submission', async () => {
  window.history.replaceState({}, '', '/auth/callback?flow=recovery'); recordRecoveryEvent('PASSWORD_RECOVERY', 'A');
  const { container } = render(<Reset />); await screen.findByLabelText('新密碼');
  fireEvent.change(screen.getByLabelText('新密碼'), { target: { value: 'test-password-123' } });
  fireEvent.change(screen.getByLabelText('再次輸入新密碼'), { target: { value: 'test-password-123' } });
  state.user = { id: 'B' }; fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('無效')); expect(state.update).not.toHaveBeenCalled();
});

it('routes the recovery callback to the reset screen rather than ordinary login continuation', async () => {
  window.history.replaceState({}, '', '/auth/callback?flow=recovery'); state.query = { flow: 'recovery', redirect: '//evil.example' };
  render(<Callback />); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('無效'));
  expect(state.replace).not.toHaveBeenCalled();
});
it('keeps signup continuation internal', async () => {
  window.history.replaceState({}, '', '/auth/callback?flow=signup'); state.query = { flow: 'signup', redirect: '//evil.example' };
  render(<Callback />); await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/my-plans'));
});
it('allows retry when the email cooldown has ended', async () => {
  vi.useFakeTimers();
  const { container } = render(<Help />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  await act(async () => { fireEvent.submit(container.querySelector('form')!); });
  expect(state.reset).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(61_000); });
  await act(async () => { fireEvent.submit(container.querySelector('form')!); });
  expect(state.reset).toHaveBeenCalledTimes(2);
});
it('retains the form after a failed update and can retry without reporting false success', async () => {
  window.history.replaceState({}, '', '/auth/callback?flow=recovery'); recordRecoveryEvent('PASSWORD_RECOVERY', 'A');
  state.update.mockResolvedValueOnce({ error: new Error('server failure') }).mockResolvedValueOnce({ error: null });
  const { container } = render(<Reset />); await screen.findByLabelText('新密碼');
  fireEvent.change(screen.getByLabelText('新密碼'), { target: { value: 'test-password-123' } });
  fireEvent.change(screen.getByLabelText('再次輸入新密碼'), { target: { value: 'test-password-123' } });
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('未能更新'));
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('密碼已更新'));
  expect(state.update).toHaveBeenCalledTimes(2);
});

it('waits for a delayed SDK recovery event instead of guessing task order', async () => {
  beginRecoveryAttempt(true);
  render(<Reset />);
  expect(screen.queryByLabelText('新密碼')).toBeNull();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); recordRecoveryEvent('PASSWORD_RECOVERY', 'A'); });
  expect(await screen.findByLabelText('新密碼')).toBeTruthy();
});

it('does not update a changed account while server user validation is pending', async () => {
  window.history.replaceState({}, '', '/auth/callback?flow=recovery'); recordRecoveryEvent('PASSWORD_RECOVERY', 'A');
  const { container } = render(<Reset />); await screen.findByLabelText('新密碼');
  fireEvent.change(screen.getByLabelText('新密碼'), { target: { value: 'test-password-123' } });
  fireEvent.change(screen.getByLabelText('再次輸入新密碼'), { target: { value: 'test-password-123' } });
  let resolve!: (value: { data: { user: { id: string } }; error: null }) => void;
  state.getUser.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  fireEvent.submit(container.querySelector('form')!);
  await act(async () => { state.authChange!('SIGNED_IN', { user: { id: 'B' } }); resolve({ data: { user: { id: 'A' } }, error: null }); });
  expect(state.update).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toContain('無效');
});

it('clears completed feedback when switching modes, retains email/cooldown and waits for an actual resend', async () => {
  vi.useFakeTimers();
  const { container, rerender } = render(<Help />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  await act(async () => { fireEvent.submit(container.querySelector('form')!); });
  expect(screen.getByRole('status').textContent).toContain('如該地址');
  state.query = { mode: 'resend', redirect: '/generate?draft=1' };
  rerender(<Help />);
  expect(screen.getByRole('heading', { name: '重發驗證郵件' })).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('test@example.com');
  expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  fireEvent.submit(container.querySelector('form')!);
  expect(state.resend).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(61_000); });
  await act(async () => { fireEvent.submit(container.querySelector('form')!); });
  expect(state.resend).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status').textContent).toContain('如該地址');
});
it.each([{ error: null, switchBack: false }, { error: { status: 429 }, switchBack: false }, { error: null, switchBack: true }, { error: { status: 429 }, switchBack: true }])('ignores late old-mode responses: %j', async ({ error, switchBack }) => {
  let resolve!: (value: { error: typeof error }) => void;
  state.reset.mockReturnValue(new Promise(done => { resolve = done; }));
  const { container, rerender } = render(<Help />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  fireEvent.submit(container.querySelector('form')!);
  state.query = { mode: 'resend' }; rerender(<Help />);
  if (switchBack) { state.query = {}; rerender(<Help />); }
  await act(async () => resolve({ error }));
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  state.query = {}; rerender(<Help />);
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(state.resend).not.toHaveBeenCalled();
});
