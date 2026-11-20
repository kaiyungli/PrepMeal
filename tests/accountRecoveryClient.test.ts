// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ options: null as null | { storageKey: string; flowType: string }, callback: null as null | ((event: string, session: { user: { id: string } } | null) => void) }));
vi.mock('@supabase/auth-js', () => ({ AuthClient: class {
  constructor(options: { storageKey: string; flowType: string }) { state.options = options; }
  onAuthStateChange(callback: (event: string, session: { user: { id: string } } | null) => void) { state.callback = callback; }
} }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); sessionStorage.clear(); });
it('wires recovery on the active lightweight client and clears stale handoff for fresh code', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic');
  window.history.replaceState({}, '', '/auth/callback?flow=recovery&code=synthetic');
  const recovery = await import('@/features/auth/recoverySession');
  recovery.recordRecoveryEvent('PASSWORD_RECOVERY', 'old');
  await import('@/lib/supabase');
  expect(recovery.hasRecoverySession('old')).toBe(false);
  expect(state.options!.storageKey).toBe('sb-synthetic-auth-token');
  expect(state.options!.flowType).toBe('implicit');
  const ready = recovery.waitForRecoverySession('new');
  state.callback!('PASSWORD_RECOVERY', { user: { id: 'new' } });
  expect(await ready).toBe(true);
  state.callback!('SIGNED_OUT', null);
  expect(recovery.hasRecoverySession('new')).toBe(false);
});
