import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ server: { from: vi.fn(), rpc: vi.fn() }, requireAuth: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => mocks.server }));
vi.mock('@/pages/api/user/_auth', () => ({ requireAuth: mocks.requireAuth, ApiResponse: {
  success: (data: unknown) => ({ success: true, data }), error: (error: string) => ({ success: false, error }),
  badRequest: (error: string) => ({ success: false, error }),
} }));
import handler from '@/pages/api/user/favorites/index';
function response() { return { statusCode: 200, body: undefined as unknown, setHeader: vi.fn(),
  status(n: number) { this.statusCode = n; return this; }, json(body: unknown) { this.body = body; return this; } }; }
const request = (path: unknown = 'rpc', perf = '1', include: unknown = 'recipes') => ({ method: 'GET',
  headers: { 'x-prepmeal-favorites-perf': perf }, query: { include, read_path: path, user_id: 'attacker-supplied' } });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('FAVORITES_RPC_COMPARISON_ENABLED', '1');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic');
  mocks.requireAuth.mockResolvedValue('verified-owner'); });
afterEach(() => vi.unstubAllEnvs());
it('RPC GET binds only the verified caller and preserves projection/null/empty contracts', async () => {
  for (const rows of [[], [{ recipe_id: 'A', recipes: { id: 'A', diet: ['vegetarian'], flavor: ['spicy'], times_shown: 2 } }, { recipe_id: 'B', recipes: null }]]) {
    mocks.server.rpc.mockResolvedValueOnce({ data: rows, error: null }); const res = response();
    await handler(request() as never, res as never);
    expect(mocks.server.rpc).toHaveBeenLastCalledWith('get_favorites_recipes_comparison', { p_user_id: 'verified-owner' }, { get: true });
    expect(mocks.server.from).not.toHaveBeenCalled(); expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { favorites: rows.map(r => r.recipe_id), recipes: rows.flatMap(r => r.recipes ? [r.recipes] : []) } });
    expect(res.setHeader).toHaveBeenCalledWith('X-PrepMeal-Favorites-Read-Path', 'rpc');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  }
});
it('disabled RPC fails closed without querying or falling back', async () => {
  vi.stubEnv('FAVORITES_RPC_COMPARISON_ENABLED', '0'); const res = response();
  await handler(request() as never, res as never); expect(res.statusCode).toBe(503);
  expect(mocks.server.from).not.toHaveBeenCalled(); expect(mocks.server.rpc).not.toHaveBeenCalled();
});
it.each([[ 'rpc', '', 'recipes' ], [ 'other', '1', 'recipes' ], [ ['rpc', 'rest'], '1', 'recipes' ], ['rpc', '1', undefined]])(
  'invalid or non-diagnostic selector fails before DB (%j)', async (path, perf, include) => {
    const res = response(); const req = request(path, perf, include);
    if (include === undefined) req.query.include = undefined;
    await handler(req as never, res as never); expect(res.statusCode).toBe(400);
    expect(mocks.server.rpc).not.toHaveBeenCalled(); expect(mocks.server.from).not.toHaveBeenCalled();
  });
it('RPC errors stay fixed and never fall back to REST or export private details', async () => {
  mocks.server.rpc.mockResolvedValueOnce({ data: null, error: { message: 'private-db-error' } }); const res = response();
  await handler(request() as never, res as never); expect(res.statusCode).toBe(500);
  expect(JSON.stringify(res.body)).not.toContain('private'); expect(mocks.server.from).not.toHaveBeenCalled();
});
it('authentication failure cannot reach RPC even when enabled', async () => {
  mocks.requireAuth.mockImplementationOnce(async (_req, res) => { res.status(401).json({ success: false }); return null; });
  const res = response(); await handler(request() as never, res as never); expect(res.statusCode).toBe(401);
  expect(mocks.server.rpc).not.toHaveBeenCalled(); expect(mocks.server.from).not.toHaveBeenCalled();
});
it('rejected RPC transport preserves a fixed error without REST fallback', async () => {
  mocks.server.rpc.mockRejectedValueOnce(new Error('private-transport-error')); const res = response();
  await handler(request() as never, res as never); expect(res.statusCode).toBe(500);
  expect(res.body).toEqual({ success: false, error: 'RPC comparison read failed' });
  expect(mocks.server.from).not.toHaveBeenCalled();
});
