import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  single: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/pages/api/user/_auth', () => ({
  requireAuth: mocks.requireAuth,
  ApiResponse: {
    success: (data: unknown) => ({ success: true, data }),
    created: (data: unknown) => ({ success: true, data }),
    error: (error: string) => ({ success: false, error }),
    unauthorized: () => ({ success: false, error: 'Unauthorized - please log in' }),
    notFound: (error: string) => ({ success: false, error }),
    methodNotAllowed: () => ({ success: false, error: 'Method not allowed' }),
    badRequest: (error: string) => ({ success: false, error }),
  },
}));

// Chainable query-builder stub: every method but `.single()` returns itself;
// `.single()` is the one awaited call in every code path of the handler.
function makeQueryBuilder() {
  const builder: Record<string, unknown> = {};
  ['from', 'select', 'eq', 'insert', 'upsert'].forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.single = mocks.single;
  return builder;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

import handler from '@/pages/api/user/preferences/index';

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

type MockResponse = ReturnType<typeof createResponse>;

const existingRow = {
  user_id: 'user-1',
  default_servings: 3,
  preferred_cuisines: ['chinese'],
  preferred_proteins: [],
  excluded_ingredients: [],
  max_cook_time: null,
  difficulty_level: null,
  unit_language: 'zh',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  mocks.requireAuth.mockResolvedValue('user-1');
  mocks.createClient.mockImplementation(() => makeQueryBuilder());
});

describe('GET /api/user/preferences', () => {
  it('does not touch the database when unauthenticated', async () => {
    mocks.requireAuth.mockImplementation(async (_req: unknown, res: MockResponse) => {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return null;
    });
    const response = createResponse();

    await handler({ method: 'GET', headers: {} } as never, response as never);

    expect(response.statusCode).toBe(401);
    expect(mocks.single).not.toHaveBeenCalled();
  });

  it('creates a per-request client authorized with the caller bearer token (regression guard for the RLS bug)', async () => {
    mocks.single.mockResolvedValueOnce({ data: existingRow, error: null });
    const response = createResponse();

    await handler(
      { method: 'GET', headers: { authorization: 'Bearer caller-token' } } as never,
      response as never,
    );

    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        global: { headers: { Authorization: 'Bearer caller-token' } },
      }),
    );
  });

  it('returns the existing row without lazily creating one', async () => {
    mocks.single.mockResolvedValueOnce({ data: existingRow, error: null });
    const response = createResponse();

    await handler(
      { method: 'GET', headers: { authorization: 'Bearer token' } } as never,
      response as never,
    );

    expect(mocks.single).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true, data: { preferences: existingRow } });
  });

  it('lazy-creates defaults when no row exists yet (PGRST116)', async () => {
    const created = { user_id: 'user-1', default_servings: 1, preferred_cuisines: [], preferred_proteins: [], excluded_ingredients: [], max_cook_time: null, difficulty_level: null, unit_language: 'en' };
    mocks.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
      .mockResolvedValueOnce({ data: created, error: null });
    const response = createResponse();

    await handler(
      { method: 'GET', headers: { authorization: 'Bearer token' } } as never,
      response as never,
    );

    expect(mocks.single).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true, data: { preferences: created } });
  });

  it('maps an unexpected select error to 500', async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: { code: 'XX000', message: 'db down' } });
    const response = createResponse();

    await handler(
      { method: 'GET', headers: { authorization: 'Bearer token' } } as never,
      response as never,
    );

    expect(response.statusCode).toBe(500);
  });
});

describe('PUT/PUT /api/user/preferences', () => {
  it('upserts only the allowed fields plus user_id', async () => {
    const updated = { ...existingRow, default_servings: 4, unit_language: 'en' };
    mocks.single.mockResolvedValueOnce({ data: updated, error: null });
    const response = createResponse();

    await handler(
      {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        body: { default_servings: 4, unit_language: 'en' },
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true, data: { preferences: updated } });
  });

  it('accepts POST as an alias for PUT', async () => {
    mocks.single.mockResolvedValueOnce({ data: existingRow, error: null });
    const response = createResponse();

    await handler(
      { method: 'POST', headers: { authorization: 'Bearer token' }, body: { difficulty_level: 'hard' } } as never,
      response as never,
    );

    expect(response.statusCode).toBe(200);
  });

  it('rejects an unsupported field with 400 and never touches the database', async () => {
    const response = createResponse();

    await handler(
      {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        body: { theme: 'dark' },
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(400);
    expect(mocks.single).not.toHaveBeenCalled();
  });

  it('rejects the whole request (no partial write) when mixed with valid fields', async () => {
    const response = createResponse();

    await handler(
      {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        body: { default_servings: 7, notifications_enabled: true },
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(400);
    expect((response.body as { error: string }).error).toContain('notifications_enabled');
    expect(mocks.single).not.toHaveBeenCalled();
  });

  it('rejects a client-supplied user_id override (no self-serve cross-account write path)', async () => {
    const response = createResponse();

    await handler(
      {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        body: { user_id: 'someone-elses-id', default_servings: 99 },
      } as never,
      response as never,
    );

    expect(response.statusCode).toBe(400);
    expect(mocks.single).not.toHaveBeenCalled();
  });

  it('rejects a non-object body with 400', async () => {
    const response = createResponse();

    await handler(
      { method: 'PUT', headers: { authorization: 'Bearer token' }, body: null } as never,
      response as never,
    );

    expect(response.statusCode).toBe(400);
    expect(mocks.single).not.toHaveBeenCalled();
  });
});

it('405s on unsupported methods', async () => {
  const response = createResponse();
  await handler(
    { method: 'DELETE', headers: { authorization: 'Bearer token' } } as never,
    response as never,
  );
  expect(response.statusCode).toBe(405);
});

describe('regression guard: must not use the shared anon-key client', () => {
  it('the handler source never imports the shared @/lib/supabase client', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/api/user/preferences/index.js'),
      'utf8',
    );
    expect(source).not.toMatch(/from ['"]@\/lib\/supabase['"]/);
    expect(source).toMatch(/from ['"]@\/lib\/supabaseUserClient['"]/);
  });
});
