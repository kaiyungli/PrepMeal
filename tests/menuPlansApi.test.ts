import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/pages/api/user/_auth', () => ({
  requireAuth: mocks.requireAuth,
  ApiResponse: {
    success: (data: unknown) => ({ success: true, data }),
    created: (data: unknown) => ({ success: true, data }),
    error: (error: string) => ({ success: false, error }),
    unauthorized: () => ({ success: false, error: 'Unauthorized - please log in' }),
    methodNotAllowed: () => ({ success: false, error: 'Method not allowed' }),
    badRequest: (error: string) => ({ success: false, error }),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

import handler from '@/pages/api/user/menus/index';

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      return response;
    },
  };
  return response;
}

const validBody = {
  name: '測試餐單',
  week_start_date: '2026-09-09',
  days_count: 3,
  items: [
    {
      day_index: 0,
      meal_type: 'dinner',
      recipe_id: '11111111-1111-4111-8111-111111111111',
      servings: 2,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  mocks.requireAuth.mockResolvedValue('user-1');
});

describe('POST /api/user/menus', () => {
  it('uses the authenticated atomic RPC as the only write', async () => {
    mocks.rpc.mockResolvedValue({ data: 'plan-1', error: null });
    const response = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: validBody,
      } as never,
      response as never,
    );

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith('create_menu_plan_atomic', {
      p_name: validBody.name,
      p_week_start_date: validBody.week_start_date,
      p_days_count: validBody.days_count,
      p_items: validBody.items,
    });
    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ success: true, data: { plan_id: 'plan-1' } });
  });

  it('does not call the RPC when authentication fails', async () => {
    mocks.requireAuth.mockImplementation(async (_req, res) => {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return null;
    });
    const response = createResponse();

    await handler(
      { method: 'POST', headers: {}, body: validBody } as never,
      response as never,
    );

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
  });

  it('rejects a malformed transport payload before calling PostgREST', async () => {
    const response = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { ...validBody, days_count: '3' },
      } as never,
      response as never,
    );

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('maps database input validation failures to 400', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'Days count must be between 1 and 7' },
    });
    const response = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: validBody,
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Days count must be between 1 and 7',
    });
  });

  it('keeps unexpected database failures as 500', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'Database failure' },
    });
    const response = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: validBody,
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(500);
  });
});
