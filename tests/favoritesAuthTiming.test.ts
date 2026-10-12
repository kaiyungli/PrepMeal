import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-key';
  return { verify: vi.fn(), getUser: vi.fn() };
});
vi.mock('jose', () => ({ createRemoteJWKSet: () => 'synthetic-jwks', jwtVerify: mocks.verify }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser } }) }));
import { requireAuth } from '@/pages/api/user/_auth';
import { createFavoritesServerTiming } from '@/lib/favoritesServerTiming';
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });
function setup() {
  const req = { headers: { authorization: 'Bearer synthetic-token', 'x-prepmeal-favorites-perf': '1' } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
  const timing = createFavoritesServerTiming(req, res); return { req, res, timing };
}
it('verified JWT auth records JWKS duration without making a getUser request', async () => {
  mocks.verify.mockResolvedValue({ payload: { sub: 'synthetic-user' } }); const { req, res, timing } = setup();
  expect(await timing.measure('auth', () => requireAuth(req, res, timing))).toBe('synthetic-user'); res.json({ success: true });
  expect(mocks.getUser).not.toHaveBeenCalled(); expect(res.setHeader.mock.calls[0][1]).toContain('auth_jwks;dur=');
  expect(res.setHeader.mock.calls[0][1]).not.toContain('synthetic-user');
});
it('legacy fallback remains verified and emits its own duration after JWKS fails', async () => {
  mocks.verify.mockRejectedValue(new Error('synthetic')); mocks.getUser.mockResolvedValue({ data: { user: { id: 'synthetic-user' } }, error: null });
  const { req, res, timing } = setup(); expect(await requireAuth(req, res, timing)).toBe('synthetic-user'); res.json({ success: true });
  expect(mocks.getUser).toHaveBeenCalledWith('synthetic-token');
  expect(res.setHeader.mock.calls[0][1]).toContain('auth_get_user;dur=');
});
it('invalid auth still returns 401 without allowing access when diagnostics are enabled', async () => {
  mocks.verify.mockRejectedValue(new Error('synthetic')); mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('synthetic') });
  const { req, res, timing } = setup(); expect(await requireAuth(req, res, timing)).toBeNull();
  expect(res.status).toHaveBeenCalledWith(401); expect(res.setHeader.mock.calls[0][1]).toContain('auth_get_user;dur=');
});
