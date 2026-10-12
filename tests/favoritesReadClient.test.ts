import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const server = { from: vi.fn() };
  return { server, createClient: vi.fn(() => server), requireAuth: vi.fn() };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/pages/api/user/_auth', () => ({
  requireAuth: mocks.requireAuth,
  ApiResponse: {
    success: (data: unknown) => ({ success: true, data }),
    created: (data: unknown) => ({ success: true, data }),
    error: (error: string) => ({ success: false, error }),
    badRequest: (error: string) => ({ success: false, error }),
    methodNotAllowed: () => ({ success: false, error: 'Method not allowed' }),
  },
}));
import handler from '@/pages/api/user/favorites/index';
function response() {
  return { statusCode: 200, body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; } };
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.createClient.mockReturnValue(mocks.server);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-anon';
  mocks.requireAuth.mockResolvedValue('synthetic-owner');
});
it.each([undefined, 'recipes'])('GET include=%s authenticates and uses only the shared reader', async include => {
  const rows = [{ recipe_id: 'recipe-A', recipes: { id: 'recipe-A', name: 'A' } }];
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: rows, error: null }) };
  mocks.server.from.mockReturnValue(query);
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer synthetic-token' }, query: { include } } as never, res as never);
  expect(mocks.requireAuth).toHaveBeenCalledTimes(1); expect(mocks.createClient).not.toHaveBeenCalled();
  expect(query.eq).toHaveBeenCalledWith('user_id', 'synthetic-owner');
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ success: true, data: { favorites: ['recipe-A'], ...(include ? { recipes: [rows[0].recipes] } : {}) } });
});
it.each(['POST', 'DELETE', 'PATCH'])('%s without a valid mutation creates no writer', async method => {
  const res = response();
  await handler({ method, headers: { authorization: 'Bearer synthetic-token' }, body: {}, query: {} } as never, res as never);
  expect(mocks.createClient).not.toHaveBeenCalled(); expect(mocks.server.from).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(method === 'PATCH' ? 405 : 400);
});
it('valid writes keep distinct caller tokens and disable unused session lifecycle', async () => {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const writer = { from: vi.fn(() => ({ insert })) };
  mocks.createClient.mockReturnValue(writer);
  for (const [owner, token] of [['owner-A', 'token-A'], ['owner-B', 'token-B']]) {
    mocks.requireAuth.mockResolvedValueOnce(owner);
    const res = response();
    await handler({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { recipe_id: 'recipe-A' }, query: {} } as never, res as never);
    expect(res.statusCode).toBe(201);
    expect(mocks.createClient).toHaveBeenLastCalledWith('https://example.supabase.co', 'synthetic-anon', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    expect(insert).toHaveBeenLastCalledWith({ user_id: owner, recipe_id: 'recipe-A' });
  }
  expect(mocks.server.from).not.toHaveBeenCalled(); expect(mocks.createClient).toHaveBeenCalledTimes(2);
});
it('failed authentication never reaches the shared reader', async () => {
  mocks.requireAuth.mockImplementationOnce(async (_req, res) => { res.status(401).json({ success: false }); return null; });
  const res = response();
  await handler({ method: 'GET', headers: {}, query: {} } as never, res as never);
  expect(res.statusCode).toBe(401); expect(mocks.server.from).not.toHaveBeenCalled(); expect(mocks.createClient).not.toHaveBeenCalled();
});
