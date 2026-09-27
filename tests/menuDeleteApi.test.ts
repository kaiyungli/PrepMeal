import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/pages/api/user/_auth', () => ({
  requireAuth: mocks.requireAuth,
  ApiResponse: {
    success: (data: unknown) => ({ success: true, data }),
    error: (error: string) => ({ success: false, error }),
    notFound: (error: string) => ({ success: false, error }),
    methodNotAllowed: () => ({ success: false, error: 'Method not allowed' }),
  },
}));
vi.mock('@/lib/supabaseUserClient', () => ({ createUserSupabaseClient: mocks.createClient }));
vi.mock('@/features/plans/server/getMenuPlanDetail', () => ({ getMenuPlanDetail: vi.fn() }));

import handler from '@/pages/api/user/menus/[id]';

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function clientWithDeleteResult(result: { data: unknown[] | null; error: { message: string } | null }) {
  const planQuery: {
    eq: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  } = {
    eq: vi.fn(),
    select: vi.fn().mockResolvedValue(result),
  };
  planQuery.eq.mockReturnValue(planQuery);
  const from = vi.fn(() => ({ delete: () => planQuery }));
  mocks.createClient.mockReturnValue({ from });
  return { from, planQuery };
}

const req = () => ({ method: 'DELETE', headers: { authorization: 'Bearer user-token' }, query: { id: 'plan-1' } });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  mocks.requireAuth.mockResolvedValue('owner-id');
});

describe('DELETE /api/user/menus/[id] response contract', () => {
  it('returns 200 only after the plan DELETE returns a deleted row', async () => {
    const query = clientWithDeleteResult({ data: [{ id: 'plan-1' }], error: null });
    const res = response();
    await handler(req() as never, res as never);
    expect(query.from).toHaveBeenCalledTimes(1);
    expect(query.from).toHaveBeenCalledWith('menu_plans');
    expect(query.planQuery.select).toHaveBeenCalledWith('id');
    expect(query.planQuery.eq).toHaveBeenCalledWith('id', 'plan-1');
    expect(query.planQuery.eq).toHaveBeenCalledWith('user_id', 'owner-id');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { deleted: true } });
  });

  it('returns 404 when RLS hides another owner or the plan was already deleted', async () => {
    clientWithDeleteResult({ data: [], error: null });
    const res = response();
    await handler(req() as never, res as never);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Plan not found' });
  });

  it('returns 500 on a database error rather than reporting deletion', async () => {
    const query = clientWithDeleteResult({ data: null, error: { message: 'database unavailable' } });
    const res = response();
    await handler(req() as never, res as never);
    expect(query.from).toHaveBeenCalledTimes(1);
    expect(query.from).toHaveBeenCalledWith('menu_plans');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'database unavailable' });
  });

  it('does not access the database when unauthenticated', async () => {
    mocks.requireAuth.mockImplementation(async (_req: unknown, res: ReturnType<typeof response>) => {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return null;
    });
    const res = response();
    await handler(req() as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
