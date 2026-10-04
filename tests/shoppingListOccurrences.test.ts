import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { ShoppingListResponse } from '@/features/shopping-list/types';

// A weekly plan can legitimately contain the same recipe more than once
// (add-random only excludes same-day recipes, and replacement falls back to
// recipes already in the plan). Every occurrence must count toward the
// shopping list.

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
import { fetchGeneratedPlanShoppingList } from '../src/features/generate/services/fetchGeneratedPlanShoppingList';

type IngredientRow = {
  quantity: number;
  recipe_id: string;
  ingredient_id: string;
  ingredients: { id: string; name: string; shopping_category: string };
  recipes: { id: string; name: string };
  units: { id: string; code: string; display_name_en: string; display_name_zh: string };
};

const unit = (code: string, zh: string) => ({ id: code, code, display_name_en: code, display_name_zh: zh });

function row(recipeId: string, recipeName: string, ingredientId: string, name: string, quantity: number, category: string, unitRow = unit('pc', '隻')): IngredientRow {
  return {
    quantity,
    recipe_id: recipeId,
    ingredient_id: ingredientId,
    ingredients: { id: ingredientId, name, shopping_category: category },
    recipes: { id: recipeId, name: recipeName },
    units: unitRow,
  };
}

// Recipe A: 2 eggs + 100 g pork. Recipe B: 3 eggs + 1 tomato.
const INGREDIENT_ROWS: IngredientRow[] = [
  row('recipe-a', 'Recipe A', 'egg', '雞蛋', 2, 'egg'),
  row('recipe-a', 'Recipe A', 'pork', '豬肉', 100, 'meat', unit('g', '克')),
  row('recipe-b', 'Recipe B', 'egg', '雞蛋', 3, 'egg'),
  row('recipe-b', 'Recipe B', 'tomato', '番茄', 1, 'vegetable'),
];

// Recipe C has a real uuid id: 2 eggs + 100 g pork.
const RECIPE_C = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const RECIPE_D = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const RECIPE_C_SPELLINGS = [
  '3F2504E0-4F89-41D3-9A0C-0305E82C3301',
  '{3f2504e0-4f89-41d3-9a0c-0305e82c3301}',
  '3f2504e04f8941d39a0c0305e82c3301',
  '3f25-04e0-4f89-41d3-9a0c-0305-e82c-3301',
];
INGREDIENT_ROWS.push(
  row(RECIPE_C, 'Recipe C', 'egg', '雞蛋', 2, 'egg'),
  row(RECIPE_C, 'Recipe C', 'pork', '豬肉', 100, 'meat', unit('g', '克')),
);

// Postgres uuid comparison: case, braces and hyphen placement do not matter,
// and the column always returns the lower-case hyphenated form.
function pgId(id: string): string {
  const hex = id.replace(/^\{(.*)\}$/, '$1').replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return id;
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

// Behaves like PostgREST `.in()`: each matching row is returned once, no
// matter how many times an id appears in the filter list. `returnedRows`
// replaces the ingredient query result outright.
function createDatabase(publicRecipeIds = ['recipe-a', 'recipe-b', RECIPE_C], returnedRows?: IngredientRow[]) {
  const visibilityQueryIds: string[][] = [];
  const ingredientQueryIds: string[][] = [];

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'user_preferences') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { unit_language: 'zh' } }) }) }) };
      }
      if (table === 'recipes') {
        return {
          select: () => ({
            in: (_column: string, ids: string[]) => ({
              eq: async () => {
                visibilityQueryIds.push([...ids]);
                const requested = ids.map(pgId);
                return { data: publicRecipeIds.filter((id) => requested.includes(id)).map((id) => ({ id })), error: null };
              },
            }),
          }),
        };
      }
      if (table === 'recipe_ingredients') {
        return {
          select: () => ({
            in: async (_column: string, ids: string[]) => {
              ingredientQueryIds.push([...ids]);
              const requested = ids.map(pgId);
              return { data: returnedRows ?? INGREDIENT_ROWS.filter((r) => requested.includes(r.recipe_id)), error: null };
            },
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { client, visibilityQueryIds, ingredientQueryIds };
}

async function request(recipeIds: string[], servings = 1, publicRecipeIds?: string[], returnedRows?: IngredientRow[]) {
  const database = createDatabase(publicRecipeIds, returnedRows);
  createClientMock.mockReturnValue(database.client);
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  await handler(
    { method: 'POST', headers: { authorization: 'Bearer token' }, body: { recipeIds, pantryIngredients: [], servings } } as unknown as NextApiRequest,
    response as unknown as NextApiResponse,
  );
  return { ...database, statusCode: response.statusCode, body: response.body as ShoppingListResponse };
}

function toBuyQuantities(body: ShoppingListResponse): Record<string, number> {
  return Object.fromEntries(
    body.toBuy.flatMap((section) => section.items).map((item) => [`${item.name}|${item.unit}`, item.quantity as number]),
  );
}

function byRecipeQuantities(body: ShoppingListResponse): Record<string, Record<string, number>> {
  return Object.fromEntries(
    body.byRecipe.map((group) => [
      group.recipeId,
      Object.fromEntries(group.toBuy.map((item) => [`${item.name}|${item.unit}`, item.quantity as number])),
    ]),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-secret';
  requireAuthMock.mockResolvedValue('verified-user');
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('/api/shopping-list recipe occurrences', () => {
  it('keeps single-occurrence quantities unchanged', async () => {
    const { statusCode, body } = await request(['recipe-a']);

    expect(statusCode).toBe(200);
    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 2, '豬肉|g': 100 });
    expect(body.summary).toEqual({ pantryCount: 0, toBuyCount: 2, sectionCount: 2 });
  });

  it('doubles every ingredient when a recipe appears twice', async () => {
    const { body } = await request(['recipe-a', 'recipe-a']);

    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 4, '豬肉|g': 200 });
  });

  it('triples every ingredient when a recipe appears three times', async () => {
    const { body } = await request(['recipe-a', 'recipe-a', 'recipe-a']);

    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 6, '豬肉|g': 300 });
  });

  it('weights each recipe by its own occurrences and aggregates shared ingredients', async () => {
    const { body } = await request(['recipe-a', 'recipe-b', 'recipe-a']);

    // eggs: A 2 x 2 + B 3 x 1 = 7
    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 7, '豬肉|g': 200, '番茄|pc': 1 });
    expect(body.summary).toEqual({ pantryCount: 0, toBuyCount: 3, sectionCount: 3 });
    const sections = Object.fromEntries(body.toBuy.map((section) => [section.category, section.items.map((item) => item.quantity)]));
    expect(sections).toEqual({ tofu_egg: [7], meat: [200], vegetable: [1] });
  });

  it('composes occurrence and servings scaling', async () => {
    const { body } = await request(['recipe-a', 'recipe-a', 'recipe-b'], 2);

    // eggs: (2 x 2 + 3 x 1) x 2 = 14
    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 14, '豬肉|g': 400, '番茄|pc': 2 });
  });

  it('is independent of occurrence order', async () => {
    const first = await request(['recipe-a', 'recipe-b', 'recipe-a']);
    const second = await request(['recipe-b', 'recipe-a', 'recipe-a']);

    expect(toBuyQuantities(second.body)).toEqual(toBuyQuantities(first.body));
  });

  it('queries the database with unique recipe ids only', async () => {
    const { visibilityQueryIds, ingredientQueryIds } = await request(['recipe-a', 'recipe-b', 'recipe-a', 'recipe-a']);

    expect(visibilityQueryIds).toEqual([['recipe-a', 'recipe-b']]);
    expect(ingredientQueryIds).toEqual([['recipe-a', 'recipe-b']]);
  });

  it('accepts repeated public recipes even though occurrences exceed unique visible recipes', async () => {
    const { statusCode } = await request(['recipe-a', 'recipe-a', 'recipe-a'], 1, ['recipe-a']);

    expect(statusCode).toBe(200);
  });

  it('still rejects the request when any unique recipe is not public', async () => {
    const { statusCode, body, ingredientQueryIds } = await request(['recipe-a', 'recipe-a', 'private-recipe'], 1, ['recipe-a']);

    expect(statusCode).toBe(403);
    expect(body).toEqual({ error: 'One or more recipes are unavailable' });
    expect(ingredientQueryIds).toEqual([]);
  });

  it('keeps one byRecipe group per recipe with its total across occurrences', async () => {
    const { body } = await request(['recipe-a', 'recipe-b', 'recipe-a'], 2);

    expect(body.byRecipe.map((group) => group.recipeId)).toEqual(['recipe-a', 'recipe-b']);
    // byRecipe units are display names. Recipe A: 2 occurrences x 2 servings.
    expect(byRecipeQuantities(body)).toEqual({
      'recipe-a': { '雞蛋|隻': 8, '豬肉|克': 400 },
      'recipe-b': { '雞蛋|隻': 6, '番茄|隻': 2 },
    });

    // The per-recipe groups add up to the combined buy list.
    const groupedEggs = body.byRecipe.flatMap((group) => group.toBuy).filter((item) => item.name === '雞蛋')
      .reduce((sum, item) => sum + (item.quantity as number), 0);
    expect(groupedEggs).toBe(toBuyQuantities(body)['雞蛋|pc']);
  });
});

describe('/api/shopping-list uuid recipe identity', () => {
  it('counts every spelling of the same uuid as an occurrence of one recipe', async () => {
    const { statusCode, body, visibilityQueryIds, ingredientQueryIds } = await request([RECIPE_C, ...RECIPE_C_SPELLINGS]);

    expect(statusCode).toBe(200);
    // 5 occurrences x (2 eggs + 100 g pork)
    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 10, '豬肉|g': 500 });
    expect(byRecipeQuantities(body)).toEqual({ [RECIPE_C]: { '雞蛋|隻': 10, '豬肉|克': 500 } });
    expect(visibilityQueryIds).toEqual([[RECIPE_C]]);
    expect(ingredientQueryIds).toEqual([[RECIPE_C]]);
  });

  it('keeps multiplicity when only non-canonical spellings are requested', async () => {
    const { statusCode, body } = await request([RECIPE_C_SPELLINGS[0], RECIPE_C_SPELLINGS[0], RECIPE_C_SPELLINGS[2]], 2);

    expect(statusCode).toBe(200);
    // 3 occurrences x 2 servings
    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 12, '豬肉|g': 600 });
  });

  it('does not fail visibility for equivalent spellings of one public recipe', async () => {
    const { statusCode, body } = await request([RECIPE_C, RECIPE_C_SPELLINGS[0]], 1, [RECIPE_C]);

    expect(statusCode).toBe(200);
    expect(toBuyQuantities(body)).toEqual({ '雞蛋|pc': 4, '豬肉|g': 200 });
  });

  it('still rejects a distinct private uuid alongside spellings of a public one', async () => {
    const { statusCode, ingredientQueryIds } = await request([RECIPE_C_SPELLINGS[0], RECIPE_C, RECIPE_D.toUpperCase()], 1, [RECIPE_C]);

    expect(statusCode).toBe(403);
    expect(ingredientQueryIds).toEqual([]);
  });

  it('fails instead of undercounting an ingredient row it cannot match to a requested recipe', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const strayRows = [row(RECIPE_D, 'Recipe D', 'egg', '雞蛋', 2, 'egg')];

    const { statusCode } = await request([RECIPE_C, RECIPE_C], 1, [RECIPE_C], strayRows);

    expect(statusCode).toBe(500);
  });
});

describe('fetchGeneratedPlanShoppingList recipe occurrences', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  it('sends every occurrence and never reuses a cached list for a different multiplicity', async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>>(async () => ({
      ok: true,
      json: async () => ({ pantry: [], toBuy: [], byRecipe: [], summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const options = { token: 'token', cacheScope: 'user' };

    await fetchGeneratedPlanShoppingList({ mon: [{ id: 'recipe-a' }] }, [], 1, options);
    await fetchGeneratedPlanShoppingList({ mon: [{ id: 'recipe-a' }], tue: [{ id: 'recipe-a' }] }, [], 1, options);
    // Same multiset in a different order may reuse the cached list.
    await fetchGeneratedPlanShoppingList({ mon: [{ id: 'recipe-a' }], tue: [{ id: 'recipe-a' }] }, [], 1, options);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).recipeIds).toEqual(['recipe-a', 'recipe-a']);
  });
});
