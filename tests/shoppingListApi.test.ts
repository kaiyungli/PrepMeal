import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const { requireAuthMock, createClientMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock('../src/pages/api/user/_auth.js', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

import handler from '../src/pages/api/shopping-list';

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockImplementation((statusCode: number) => {
      response.statusCode = statusCode;
      return response;
  });
  response.json.mockImplementation((body: unknown) => {
      response.body = body;
      return response;
  });
  return {
    response,
    apiResponse: response as unknown as NextApiResponse,
  };
}

function createRequest(value: Partial<NextApiRequest>): NextApiRequest {
  return value as NextApiRequest;
}

function createDatabase({ visibleRecipeIds = ['recipe-1'] }: { visibleRecipeIds?: string[] } = {}) {
  const preferenceUserIds: string[] = [];
  let ingredientQueryCount = 0;

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: () => ({
            eq: (_column: string, userId: string) => {
              preferenceUserIds.push(userId);
              return { single: async () => ({ data: { unit_language: 'zh' } }) };
            },
          }),
        };
      }

      if (table === 'recipes') {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({
                data: visibleRecipeIds.map((id) => ({ id })),
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'recipe_ingredients') {
        return {
          select: () => ({
            in: async () => {
              ingredientQueryCount += 1;
              return { data: [], error: null };
            },
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    client,
    preferenceUserIds,
    getIngredientQueryCount: () => ingredientQueryCount,
  };
}

describe('/api/shopping-list security boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-secret';
  });

  it('returns 401 before database access when authentication fails', async () => {
    requireAuthMock.mockImplementation(async (_request, response) => {
      response.status(401).json({ error: 'Unauthorized' });
      return null;
    });

    const { response, apiResponse } = createResponse();
    await handler(createRequest({ method: 'POST', headers: {}, body: { recipeIds: ['recipe-1'] } }), apiResponse);

    expect(response.statusCode).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('uses the verified user id and ignores a client-supplied userId', async () => {
    requireAuthMock.mockResolvedValue('verified-user');
    const database = createDatabase();
    createClientMock.mockReturnValue(database.client);

    const { response, apiResponse } = createResponse();
    await handler(createRequest({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { userId: 'attacker-selected-user', recipeIds: ['recipe-1'], servings: 1 },
    }), apiResponse);

    expect(response.statusCode).toBe(200);
    expect(database.preferenceUserIds).toEqual(['verified-user']);
    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'server-only-secret',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  });

  it('rejects the whole request if any selected recipe is not public', async () => {
    requireAuthMock.mockResolvedValue('verified-user');
    const database = createDatabase({ visibleRecipeIds: ['recipe-1'] });
    createClientMock.mockReturnValue(database.client);

    const { response, apiResponse } = createResponse();
    await handler(createRequest({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { recipeIds: ['recipe-1', 'private-recipe'], servings: 1 },
    }), apiResponse);

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: 'One or more recipes are unavailable' });
    expect(database.getIngredientQueryCount()).toBe(0);
  });

  it('fails closed when the server-only key is missing', async () => {
    requireAuthMock.mockResolvedValue('verified-user');
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { response, apiResponse } = createResponse();
    await handler(createRequest({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { recipeIds: ['recipe-1'] },
    }), apiResponse);

    expect(response.statusCode).toBe(500);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
