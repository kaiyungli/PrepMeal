import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { ShoppingListResponse } from '@/features/shopping-list/types';

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

function createDatabase({
  visibleRecipeIds = ['recipe-1'],
  ingredientRows = [] as unknown[],
}: { visibleRecipeIds?: string[]; ingredientRows?: unknown[] } = {}) {
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
              return { data: ingredientRows, error: null };
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

  it('merges the same ingredient across rows whose raw unit codes normalize to the same canonical unit, and applies the servings multiplier', async () => {
    requireAuthMock.mockResolvedValue('verified-user');
    const database = createDatabase({
      ingredientRows: [
        {
          quantity: 2,
          recipe_id: 'recipe-1',
          ingredient_id: 'beef-1',
          ingredients: { id: 'beef-1', name: '牛肉', shopping_category: 'meat' },
          recipes: { id: 'recipe-1', name: 'Recipe One' },
          // Raw code 'gram' normalizes to 'g'
          units: { id: 'u1', code: 'gram', display_name_en: 'gram', display_name_zh: '克' },
        },
        {
          quantity: 3,
          recipe_id: 'recipe-1',
          ingredient_id: 'beef-1',
          ingredients: { id: 'beef-1', name: '牛肉', shopping_category: 'meat' },
          recipes: { id: 'recipe-1', name: 'Recipe One' },
          // Raw code 'g' is already the canonical unit
          units: { id: 'u2', code: 'g', display_name_en: 'gram', display_name_zh: '克' },
        },
      ],
    });
    createClientMock.mockReturnValue(database.client);

    const { response, apiResponse } = createResponse();
    await handler(createRequest({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { recipeIds: ['recipe-1'], servings: 2 },
    }), apiResponse);

    expect(response.statusCode).toBe(200);
    const items = (response.body as ShoppingListResponse).toBuy.flatMap((section) => section.items);
    // (2 * 2 servings) + (3 * 2 servings) = 10
    expect(items).toEqual([
      expect.objectContaining({ ingredientId: 'beef-1', quantity: 10, unit: 'g' }),
    ]);
  });

  it('keeps the same ingredient in incompatible mass units (g vs kg) as two separate, un-summed items', async () => {
    requireAuthMock.mockResolvedValue('verified-user');
    const database = createDatabase({
      ingredientRows: [
        {
          quantity: 200,
          recipe_id: 'recipe-1',
          ingredient_id: 'beef-1',
          ingredients: { id: 'beef-1', name: '牛肉', shopping_category: 'meat' },
          recipes: { id: 'recipe-1', name: 'Recipe One' },
          units: { id: 'u1', code: 'g', display_name_en: 'gram', display_name_zh: '克' },
        },
        {
          quantity: 0.2,
          recipe_id: 'recipe-1',
          ingredient_id: 'beef-1',
          ingredients: { id: 'beef-1', name: '牛肉', shopping_category: 'meat' },
          recipes: { id: 'recipe-1', name: 'Recipe One' },
          units: { id: 'u2', code: 'kg', display_name_en: 'kilogram', display_name_zh: '千克' },
        },
      ],
    });
    createClientMock.mockReturnValue(database.client);

    const { response, apiResponse } = createResponse();
    await handler(createRequest({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { recipeIds: ['recipe-1'], servings: 1 },
    }), apiResponse);

    expect(response.statusCode).toBe(200);
    const items = (response.body as ShoppingListResponse).toBuy.flatMap((section) => section.items);
    // Must NOT raw-sum to 200.2 under one unit -- each normalized unit is its own line.
    expect(items).toEqual([
      expect.objectContaining({ ingredientId: 'beef-1', quantity: 200, unit: 'g' }),
      expect.objectContaining({ ingredientId: 'beef-1', quantity: 0.2, unit: 'kg' }),
    ]);
  });

  it('keeps the same ingredient in incompatible volume-ish units (tsp vs tbsp) as two separate, un-summed items', async () => {
    requireAuthMock.mockResolvedValue('verified-user');
    const database = createDatabase({
      ingredientRows: [
        {
          quantity: 2,
          recipe_id: 'recipe-1',
          ingredient_id: 'ginger-1',
          ingredients: { id: 'ginger-1', name: '薑', shopping_category: 'vegetable' },
          recipes: { id: 'recipe-1', name: 'Recipe One' },
          units: { id: 'u1', code: 'tsp', display_name_en: 'teaspoon', display_name_zh: '茶匙' },
        },
        {
          quantity: 3,
          recipe_id: 'recipe-1',
          ingredient_id: 'ginger-1',
          ingredients: { id: 'ginger-1', name: '薑', shopping_category: 'vegetable' },
          recipes: { id: 'recipe-1', name: 'Recipe One' },
          units: { id: 'u2', code: 'tbsp', display_name_en: 'tablespoon', display_name_zh: '湯匙' },
        },
      ],
    });
    createClientMock.mockReturnValue(database.client);

    const { response, apiResponse } = createResponse();
    await handler(createRequest({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { recipeIds: ['recipe-1'], servings: 1 },
    }), apiResponse);

    expect(response.statusCode).toBe(200);
    const items = (response.body as ShoppingListResponse).toBuy.flatMap((section) => section.items);
    // Must NOT raw-sum to 5 tsp -- no conversion factor between tsp and tbsp is applied.
    expect(items).toEqual([
      expect.objectContaining({ ingredientId: 'ginger-1', quantity: 2, unit: 'tsp' }),
      expect.objectContaining({ ingredientId: 'ginger-1', quantity: 3, unit: 'tbsp' }),
    ]);
  });
});
