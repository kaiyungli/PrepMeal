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
  vi.stubEnv('VERCEL_ENV', ''); vi.stubEnv('FAVORITES_PREVIEW_RPC_ENABLED', '');
  vi.stubEnv('FAVORITES_PRODUCTION_RPC_ENABLED', '');
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
function ordinaryRequest(perf = '') {
  const req = request('rest', perf);
  return { ...req, query: { include: 'recipes', user_id: 'attacker-supplied' } as Record<string, unknown> };
}
function mockRest(rows: unknown[] = []) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn(() => ({ eq })); mocks.server.from.mockReturnValue({ select });
  return { eq, select };
}
it('ordinary full-recipe preview GET uses one RPC bound to verified owner, without requiring diagnostics', async () => {
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('FAVORITES_PREVIEW_RPC_ENABLED', '1');
  mocks.server.rpc.mockResolvedValue({ data: [{ recipe_id: 'A', recipes: { id: 'A' } }], error: null });
  const res = response(); await handler(ordinaryRequest() as never, res as never);
  expect(mocks.server.rpc).toHaveBeenCalledExactlyOnceWith('get_favorites_recipes_comparison', { p_user_id: 'verified-owner' }, { get: true });
  expect(mocks.server.from).not.toHaveBeenCalled(); expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ success: true, data: { favorites: ['A'], recipes: [{ id: 'A' }] } });
  expect(res.setHeader).toHaveBeenCalledWith('X-PrepMeal-Favorites-Read-Path', 'rpc');
});
it.each(['production', 'development', '', 'staging'])('ordinary full read remains REST outside exact preview (%s)', async environment => {
  vi.stubEnv('VERCEL_ENV', environment); vi.stubEnv('FAVORITES_PREVIEW_RPC_ENABLED', '1');
  const rest = mockRest(); const res = response(); await handler(ordinaryRequest() as never, res as never);
  expect(mocks.server.rpc).not.toHaveBeenCalled(); expect(rest.eq).toHaveBeenCalledWith('user_id', 'verified-owner'); expect(res.statusCode).toBe(200);
});
it.each(['preview_flag', 'comparison_flag', 'ids_only', 'rest_control'])('preview rollback/control keeps REST (%s)', async mode => {
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('FAVORITES_PREVIEW_RPC_ENABLED', mode === 'preview_flag' ? '0' : '1');
  if (mode === 'comparison_flag') vi.stubEnv('FAVORITES_RPC_COMPARISON_ENABLED', '0');
  const rest = mockRest(); const req = ordinaryRequest('1');
  if (mode === 'ids_only') req.query.include = undefined;
  if (mode === 'rest_control') req.query.read_path = 'rest';
  const res = response(); await handler(req as never, res as never);
  expect(mocks.server.rpc).not.toHaveBeenCalled(); expect(rest.eq).toHaveBeenCalledWith('user_id', 'verified-owner'); expect(res.statusCode).toBe(200);
});
it('preview RPC failure is fixed, does not silently add a REST read, and auth failures cannot start it', async () => {
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('FAVORITES_PREVIEW_RPC_ENABLED', '1');
  mocks.server.rpc.mockRejectedValueOnce(new Error('private-preview-transport')); const res = response();
  await handler(ordinaryRequest() as never, res as never);
  expect(res.statusCode).toBe(500); expect(JSON.stringify(res.body)).not.toContain('private'); expect(mocks.server.from).not.toHaveBeenCalled();
  mocks.server.rpc.mockClear(); mocks.requireAuth.mockResolvedValueOnce(null);
  await handler(ordinaryRequest() as never, response() as never); expect(mocks.server.rpc).not.toHaveBeenCalled();
});
it('ordinary production full read uses exactly one RPC for the verified owner and disables response caching', async () => {
  vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('FAVORITES_PRODUCTION_RPC_ENABLED', '1');
  mocks.server.rpc.mockResolvedValue({ data: [{ recipe_id: 'A', recipes: { id: 'A' } }], error: null });
  const res = response(); await handler(ordinaryRequest() as never, res as never);
  expect(mocks.server.rpc).toHaveBeenCalledExactlyOnceWith('get_favorites_recipes_comparison', { p_user_id: 'verified-owner' }, { get: true });
  expect(mocks.server.from).not.toHaveBeenCalled();
  expect(res.body).toEqual({ success: true, data: { favorites: ['A'], recipes: [{ id: 'A' }] } });
  expect(res.setHeader).toHaveBeenCalledWith('X-PrepMeal-Favorites-Read-Path', 'rpc');
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
});
it.each(['production_flag', 'comparison_flag', 'ids_only', 'rest_control'])('production rollback/control retains REST (%s)', async mode => {
  vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('FAVORITES_PRODUCTION_RPC_ENABLED', mode === 'production_flag' ? '0' : '1');
  if (mode === 'comparison_flag') vi.stubEnv('FAVORITES_RPC_COMPARISON_ENABLED', '0');
  const rest = mockRest(); const req = ordinaryRequest('1');
  if (mode === 'ids_only') req.query.include = undefined;
  if (mode === 'rest_control') req.query.read_path = 'rest';
  const res = response(); await handler(req as never, res as never);
  expect(mocks.server.rpc).not.toHaveBeenCalled(); expect(rest.eq).toHaveBeenCalledWith('user_id', 'verified-owner'); expect(res.statusCode).toBe(200);
});
it.each(['preview', 'development', '', 'staging'])('production flag alone does not enable RPC in %s', async environment => {
  vi.stubEnv('VERCEL_ENV', environment); vi.stubEnv('FAVORITES_PRODUCTION_RPC_ENABLED', '1');
  const rest = mockRest(); const res = response(); await handler(ordinaryRequest() as never, res as never);
  expect(mocks.server.rpc).not.toHaveBeenCalled(); expect(rest.eq).toHaveBeenCalledWith('user_id', 'verified-owner'); expect(res.statusCode).toBe(200);
});
it.each(['returned', 'thrown'])('production RPC %s failure stays fixed without a second REST request', async mode => {
  vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('FAVORITES_PRODUCTION_RPC_ENABLED', '1');
  if (mode === 'returned') mocks.server.rpc.mockResolvedValueOnce({ data: null, error: { message: 'private-error' } });
  else mocks.server.rpc.mockRejectedValueOnce(new Error('private-error'));
  const res = response(); await handler(ordinaryRequest() as never, res as never);
  expect(res.statusCode).toBe(500); expect(res.body).toEqual({ success: false, error: 'RPC comparison read failed' });
  expect(mocks.server.rpc).toHaveBeenCalledTimes(1); expect(mocks.server.from).not.toHaveBeenCalled();
});
it('production RPC gate cannot bypass authentication', async () => {
  vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('FAVORITES_PRODUCTION_RPC_ENABLED', '1');
  mocks.requireAuth.mockImplementationOnce(async (_req, res) => { res.status(401).json({ success: false }); return null; });
  const res = response(); await handler(ordinaryRequest() as never, res as never);
  expect(res.statusCode).toBe(401); expect(mocks.server.rpc).not.toHaveBeenCalled(); expect(mocks.server.from).not.toHaveBeenCalled();
});
