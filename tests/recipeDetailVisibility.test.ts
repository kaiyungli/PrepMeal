import { beforeEach, describe, expect, it, vi } from 'vitest';

// Public recipe-detail routes must never return a recipe unless
// is_public === true. getRecipeDetail runs on the service-role client, which
// bypasses RLS, so the fake client below applies .eq() filters to its rows
// exactly as written by the production query: a missing is_public filter
// would let the private rows through.

type Row = Record<string, unknown>;

const PUBLIC_ID = '11111111-1111-4111-8111-111111111111';
const PRIVATE_ID = '22222222-2222-4222-8222-222222222222';

const recipes: Row[] = [
  {
    id: PUBLIC_ID, slug: 'public-recipe', is_public: true, name: 'Public recipe',
    image_url: null, description: null, difficulty: 'easy', method: 'stir_fry', speed: 'quick',
    calories_per_serving: 300, protein_g: 20, carbs_g: 30, fat_g: 10,
    total_time_minutes: 15, cook_time_minutes: 10, prep_time_minutes: 5,
    cuisine: 'chinese', primary_protein: 'egg', dish_type: 'main', diet: [],
    is_complete_meal: false, created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: PRIVATE_ID, slug: 'private-recipe', is_public: false, name: 'Private recipe',
    image_url: null, description: 'unpublished draft', difficulty: 'easy', method: 'stir_fry', speed: 'quick',
    calories_per_serving: null, protein_g: null, carbs_g: null, fat_g: null,
    total_time_minutes: null, cook_time_minutes: null, prep_time_minutes: null,
    cuisine: 'chinese', primary_protein: 'pork', dish_type: 'main', diet: [],
    is_complete_meal: false, created_at: '2026-01-02T00:00:00Z',
  },
];

const tables: Record<string, Row[]> = {
  recipes,
  recipe_ingredients: [
    { recipe_id: PUBLIC_ID, quantity: 2, unit: { id: 'u1', code: 'pc', name: 'piece', display_name_zh: '隻' }, ingredients: { id: 'i1', name: '雞蛋', slug: 'egg', shopping_category: 'egg' } },
    { recipe_id: PRIVATE_ID, quantity: 1, unit: null, ingredients: { id: 'i2', name: '豬肉', slug: 'pork', shopping_category: 'meat' } },
  ],
  recipe_steps: [
    { recipe_id: PUBLIC_ID, step_no: 1, text: '打蛋', time_seconds: null },
    { recipe_id: PRIVATE_ID, step_no: 1, text: 'private step', time_seconds: null },
  ],
};

const db = vi.hoisted(() => ({
  rpcResult: { data: null as unknown, error: null as unknown },
  fallbackError: null as unknown,
  queries: [] as Array<{ table: string; filters: Array<[string, unknown]> }>,
  client: null as unknown,
}));

function createQuery(table: string) {
  const filters: Array<[string, unknown]> = [];
  db.queries.push({ table, filters });
  const rows = () => tables[table].filter(row => filters.every(([column, value]) => row[column] === value));
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
    order: () => query,
    maybeSingle: async () => {
      if (db.fallbackError) return { data: null, error: db.fallbackError };
      const matches = rows();
      if (matches.length > 1) return { data: null, error: { message: 'multiple rows' } };
      return { data: matches[0] ?? null, error: null };
    },
    single: async () => {
      if (db.fallbackError) return { data: null, error: db.fallbackError };
      const matches = rows();
      return matches.length === 1
        ? { data: matches[0], error: null }
        : { data: null, error: { message: 'Cannot coerce the result to a single JSON object' } };
    },
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: rows(), error: null }).then(resolve, reject),
  };
  return query;
}

vi.mock('@/lib/supabaseServer', () => {
  db.client = {
    rpc: vi.fn(async () => db.rpcResult),
    from: vi.fn((table: string) => createQuery(table)),
  };
  return { supabaseServer: db.client };
});

import { getRecipeDetail } from '@/features/recipes/services/getRecipeDetail';
import { loadRecipeDetail } from '@/features/recipes';
import handler from '@/pages/api/recipes/[id]';

const RPC_ERROR = { data: null, error: { message: 'function get_recipe_detail_json does not exist' } };

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

async function callApi(id: string) {
  const res = response();
  await handler({ method: 'GET', query: { id }, headers: {} } as never, res as never);
  return res;
}

const recipeQueries = () => db.queries.filter(query => query.table === 'recipes');

beforeEach(() => {
  db.rpcResult = { data: null, error: null };
  db.fallbackError = null;
  db.queries = [];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getRecipeDetail public visibility', () => {
  it('returns a recipe from the RPC without running the fallback', async () => {
    const rpcRecipe = { id: PUBLIC_ID, name: 'Public recipe', ingredients: [], steps: [] };
    db.rpcResult = { data: rpcRecipe, error: null };

    await expect(getRecipeDetail(PUBLIC_ID)).resolves.toEqual(rpcRecipe);
    expect(db.queries).toHaveLength(0);
  });

  it.each([
    ['UUID', PRIVATE_ID],
    ['slug', 'private-recipe'],
  ])('treats a null RPC result as not found without running the fallback (%s)', async (_kind, idOrSlug) => {
    db.rpcResult = { data: null, error: null };

    await expect(getRecipeDetail(idOrSlug)).rejects.toThrow('Recipe not found');
    expect(db.queries).toHaveLength(0);
  });

  it.each([
    ['UUID', PUBLIC_ID, 'id'],
    ['slug', 'public-recipe', 'slug'],
  ])('enforces is_public=true in the fallback when the RPC errors (%s)', async (_kind, idOrSlug, column) => {
    db.rpcResult = RPC_ERROR;

    const recipe = await getRecipeDetail(idOrSlug);

    expect(recipe.id).toBe(PUBLIC_ID);
    expect(recipeQueries()).toHaveLength(1);
    expect(recipeQueries()[0].filters).toEqual(expect.arrayContaining([
      ['is_public', true],
      [column, idOrSlug],
    ]));
  });

  it.each([
    ['UUID', PRIVATE_ID],
    ['slug', 'private-recipe'],
  ])('never returns a non-public row that matches the %s in the fallback', async (_kind, idOrSlug) => {
    db.rpcResult = RPC_ERROR;

    await expect(getRecipeDetail(idOrSlug)).rejects.toThrow('Recipe not found');
    expect(db.queries.filter(query => query.table !== 'recipes')).toHaveLength(0);
  });

  it('keeps the recipe-detail shape for a public recipe loaded through the fallback', async () => {
    db.rpcResult = RPC_ERROR;

    const { recipe, error } = await loadRecipeDetail(PUBLIC_ID);

    expect(error).toBeNull();
    expect(recipe).toMatchObject({
      id: PUBLIC_ID,
      name: 'Public recipe',
      primary_protein: 'egg',
      ingredients: [{ id: 'i1', name: '雞蛋', quantity: 2, unit: { code: 'pc', name: 'piece' }, category: 'egg' }],
      steps: ['打蛋'],
    });
  });

  // pages/recipes/[id].js getStaticProps returns notFound when loadRecipeDetail
  // yields no recipe (the page module itself is JSX in .js and not importable here).
  it.each([
    ['RPC null', { data: null, error: null }],
    ['RPC error', RPC_ERROR],
  ])('gives the detail page no recipe for a non-public recipe (%s)', async (_kind, rpcResult) => {
    db.rpcResult = rpcResult;

    await expect(loadRecipeDetail('private-recipe')).resolves.toEqual({ recipe: null, error: 'Recipe not found' });
  });

  it('does not expose raw database errors from the fallback', async () => {
    db.rpcResult = RPC_ERROR;
    db.fallbackError = { message: 'permission denied for table recipes' };

    await expect(getRecipeDetail(PUBLIC_ID)).rejects.toThrow(/^Recipe fetch failed$/);
  });
});

describe('/api/recipes/[id] public visibility', () => {
  it('returns 200 with the recipe for a public recipe', async () => {
    db.rpcResult = { data: { id: PUBLIC_ID, name: 'Public recipe', ingredients: [], steps: [] }, error: null };

    const res = await callApi(PUBLIC_ID);

    expect(res.statusCode).toBe(200);
    expect((res.body as { recipe: { id: string } }).recipe.id).toBe(PUBLIC_ID);
  });

  it.each([
    ['UUID, RPC null', PRIVATE_ID, { data: null, error: null }],
    ['slug, RPC null', 'private-recipe', { data: null, error: null }],
    ['UUID, RPC error', PRIVATE_ID, RPC_ERROR],
    ['slug, RPC error', 'private-recipe', RPC_ERROR],
    ['nonexistent, RPC error', '33333333-3333-4333-8333-333333333333', RPC_ERROR],
  ])('returns a generic 404 for a non-public or missing recipe (%s)', async (_kind, idOrSlug, rpcResult) => {
    db.rpcResult = rpcResult;

    const res = await callApi(idOrSlug);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Recipe not found' });
  });
});
