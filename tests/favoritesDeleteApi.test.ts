import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/pages/api/user/_auth', () => ({
  requireAuth: mocks.requireAuth,
  ApiResponse: {
    success: (data: unknown) => ({ success: true, data }),
    error: (error: string) => ({ success: false, error }),
    notFound: (error: string) => ({ success: false, error }),
    badRequest: (error: string) => ({ success: false, error }),
    methodNotAllowed: () => ({ success: false, error: 'Method not allowed' }),
  },
}));

import handler from '@/pages/api/user/favorites/index';

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function clientWithDeleteResult(result: { data: unknown[] | null; error: { message: string } | null }) {
  const query: {
    delete: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  } = {
    delete: vi.fn(),
    eq: vi.fn(),
    select: vi.fn().mockResolvedValue(result),
  };
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const from = vi.fn(() => query);
  mocks.createClient.mockReturnValue({ from });
  return { from, query };
}

const request = (recipeId: string | null = 'recipe-1') => ({
  method: 'DELETE', headers: { authorization: 'Bearer user-token' },
  query: recipeId ? { recipe_id: recipeId } : {},
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  mocks.requireAuth.mockResolvedValue('owner-id');
});

describe('DELETE /api/user/favorites response contract', () => {
  it('returns 200 only after deleting a caller-owned favorite row', async () => {
    const client = clientWithDeleteResult({ data: [{ recipe_id: 'recipe-1' }], error: null });
    const res = response();
    await handler(request() as never, res as never);
    expect(client.from).toHaveBeenCalledWith('user_favorites');
    expect(client.query.eq).toHaveBeenCalledWith('user_id', 'owner-id');
    expect(client.query.eq).toHaveBeenCalledWith('recipe_id', 'recipe-1');
    expect(client.query.select).toHaveBeenCalledWith('recipe_id');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { recipe_id: 'recipe-1' } });
  });

  it('returns 404 for another user or an already removed favorite', async () => {
    clientWithDeleteResult({ data: [], error: null });
    const res = response();
    await handler(request() as never, res as never);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Favorite not found' });
  });

  it('returns 500 on a DB error', async () => {
    clientWithDeleteResult({ data: null, error: { message: 'database unavailable' } });
    const res = response();
    await handler(request() as never, res as never);
    expect(res.statusCode).toBe(500);
  });

  it('rejects missing recipe_id without a delete query', async () => {
    const client = clientWithDeleteResult({ data: [], error: null });
    const res = response();
    await handler(request(null) as never, res as never);
    expect(res.statusCode).toBe(400);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests without creating a user client', async () => {
    mocks.requireAuth.mockImplementation(async (_req: unknown, res: ReturnType<typeof response>) => {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return null;
    });
    const res = response();
    await handler(request() as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
