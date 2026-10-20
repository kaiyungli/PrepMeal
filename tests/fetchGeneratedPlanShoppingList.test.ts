import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchGeneratedPlanShoppingList } from '../src/features/generate/services/fetchGeneratedPlanShoppingList';

describe('fetchGeneratedPlanShoppingList auth boundary', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  it('does not reuse a cache entry for a different pantry whose joined text is identical', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      pantry: [], toBuy: [], byRecipe: [], summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
    }) });
    vi.stubGlobal('fetch', fetchMock);
    const options = { token: 'token', cacheScope: 'alice' };
    const plan = { mon: [{ id: 'recipe-1' }] };
    await fetchGeneratedPlanShoppingList(plan, ['pepper,salt'], 1, options);
    await fetchGeneratedPlanShoppingList(plan, ['salt', 'pepper'], 1, options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await fetchGeneratedPlanShoppingList(plan, ['pepper', 'salt'], 1, options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('partitions persistent cache by explicit optional choices, including base-only, and ignores unrelated recipe choices', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pantry: [], toBuy: [], byRecipe: [], summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 } }) });
    vi.stubGlobal('fetch', fetchMock);
    const plan = { mon: [{ id: 'r1' }] }; const options = { token: 'test', cacheScope: 'alice' };
    await fetchGeneratedPlanShoppingList(plan, [], 2, options);
    await fetchGeneratedPlanShoppingList(plan, [], 2, { ...options, optionalSelections: { r1: ['shrimp'] } });
    await fetchGeneratedPlanShoppingList(plan, [], 2, { ...options, optionalSelections: { r1: [], r2: ['beef'] } });
    await fetchGeneratedPlanShoppingList(plan, [], 2, { ...options, optionalSelections: { r1: [] } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).optionalSelections).toEqual({ r1: [] });
  });

  it('sends only the bearer token to the API and partitions cache by user', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>>().mockResolvedValue({
      ok: true,
      json: async () => ({
        pantry: [],
        toBuy: [],
        byRecipe: [],
        summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const plan = { mon: [{ id: 'recipe-1' }] };
    const alice = { token: 'alice-token', cacheScope: 'alice' };
    const bob = { token: 'bob-token', cacheScope: 'bob' };

    await fetchGeneratedPlanShoppingList(plan, [], 2, alice);
    await fetchGeneratedPlanShoppingList(plan, [], 2, alice);
    await fetchGeneratedPlanShoppingList(plan, [], 2, bob);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer alice-token',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      recipeIds: ['recipe-1'],
      pantryIngredients: [],
      servings: 2,
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer bob-token',
    });
  });
});

describe('fetchGeneratedPlanShoppingList consumer-boundary unit safety', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  it('preserves two rows sharing an ingredientId but incompatible normalized units as two distinct view-model items', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        pantry: [],
        toBuy: [
          {
            category: 'meat',
            items: [
              {
                ingredientId: 'beef-1',
                name: '牛肉',
                quantity: 200,
                unit: 'g',
                unitDisplay: '克',
                quantityPending: false,
              },
              {
                ingredientId: 'beef-1',
                name: '牛肉',
                quantity: 2,
                unit: 'kg',
                unitDisplay: '千克',
                quantityPending: false,
              },
            ],
          },
        ],
        byRecipe: [],
        summary: { pantryCount: 0, toBuyCount: 2, sectionCount: 1 },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const plan = { mon: [{ id: 'recipe-1' }] };
    const viewModel = await fetchGeneratedPlanShoppingList(plan, [], 1, {
      token: 'alice-token',
      cacheScope: 'unit-safety-check',
    });

    expect(viewModel.sections).toHaveLength(1);
    expect(viewModel.sections[0].items).toEqual([
      { ingredientId: 'beef-1', name: '牛肉', quantityText: '200 克', quantityPending: false },
      { ingredientId: 'beef-1', name: '牛肉', quantityText: '2 千克', quantityPending: false },
    ]);
  });
});
