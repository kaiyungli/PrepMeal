import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Integration tests for src/pages/api/admin/recipes/export.js.
//
// Shape mapping is pure and exhaustively tested in
// tests/admin-recipe-export-shape.test.ts. Here we assert the route wiring:
// auth/method gates with zero DB calls, the 200-recipe truncation guard,
// download headers, and that every field / deterministic ordering survives
// the actual query shape.

const ADMIN_SECRET = 'test-admin-secret-for-regression';
const HANDLER_MODULE = '@/pages/api/admin/recipes/export.js';
const SRC = path.resolve(__dirname, '../src/pages/api/admin/recipes/export.js');

function validAdminCookie(): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(ts).digest('hex');
  return `admin_session=${ts}.${sig}`;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return { method: 'GET', query: {}, headers: {}, ...overrides };
}

function makeRes() {
  const res: {
    statusCode: number | null;
    body: unknown;
    headers: Record<string, string>;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  } = { statusCode: null, body: undefined, headers: {}, status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  res.setHeader.mockImplementation((k: string, v: string) => {
    res.headers[k] = v;
    return res;
  });
  return res;
}

async function loadHandler() {
  const mod = await import(HANDLER_MODULE);
  return mod.default as (req: unknown, res: unknown) => Promise<unknown>;
}

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'in', 'range']) {
    chain[m] = vi.fn((...args: unknown[]) => {
      (chain.__calls as unknown[][]).push([m, ...args]);
      return chain;
    });
  }
  chain.__calls = [];
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

// A single from('recipes') call's chain -- supports the root-table paginated
// fetch shape export.js now uses: a head/exact count call
// (`.select(col, {count:'exact', head:true})`, no `.in(...)` filter) and a
// ranged page call (`.select('*').order(...).order(...).range(from, to)`).
// Backed by an in-memory `rows` array so pagination behaves like real
// PostgREST would; `count` is independent of `rows.length` so a test can
// simulate a count/data mismatch (e.g. the server's exact count promises
// more rows than actually exist).
function makeRecipesChain(rows: Array<Record<string, unknown>>, opts: { count: unknown }) {
  const chain: Record<string, unknown> = {};
  let isCount = false;
  let rangeArgs: [number, number] | null = null;

  chain.select = vi.fn((_cols: string, selectOpts?: { count?: string; head?: boolean }) => {
    if (selectOpts && selectOpts.count) isCount = true;
    return chain;
  });
  chain.order = vi.fn(() => chain);
  chain.range = vi.fn((from: number, to: number) => {
    rangeArgs = [from, to];
    return chain;
  });
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (isCount) {
      return Promise.resolve({ count: opts.count, error: null }).then(resolve, reject);
    }
    const [from, to] = rangeArgs ?? [0, rows.length - 1];
    const page = rows.slice(from, to + 1);
    return Promise.resolve({ data: page, error: null }).then(resolve, reject);
  };
  return chain;
}

// A single from(table) call's chain for recipe_ingredients / recipe_steps --
// supports the paginated-fetch shape export.js now uses: a head/exact count
// call (`.select(col, {count:'exact', head:true}).in(...)`) and a ranged
// page call (`.select(cols).in(...).order(...).range(from, to)`). Backed by
// an in-memory `rows` array so pagination/chunking behaves like real
// PostgREST would for the ids/range requested. `state` is shared across every
// chain built for the same table within one test, so `failOnPageCall` can
// target a specific page fetch across multiple chunks/pages.
function makeChildChain(
  rows: Array<Record<string, unknown>>,
  opts: { failOnPageCall?: number; countOverride?: number } = {},
  state: { pageCallIndex: number },
) {
  const chain: Record<string, unknown> = {};
  let filterIds: string[] | null = null;
  let isCount = false;
  let rangeArgs: [number, number] | null = null;

  chain.select = vi.fn((_cols: string, selectOpts?: { count?: string; head?: boolean }) => {
    if (selectOpts && selectOpts.count) isCount = true;
    return chain;
  });
  chain.in = vi.fn((_col: string, ids: string[]) => {
    filterIds = ids;
    return chain;
  });
  chain.order = vi.fn(() => chain);
  chain.range = vi.fn((from: number, to: number) => {
    rangeArgs = [from, to];
    return chain;
  });
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    const matched = rows.filter((r) => filterIds && filterIds.includes(r.recipe_id as string));
    if (isCount) {
      const count = opts.countOverride ?? matched.length;
      return Promise.resolve({ count, error: null }).then(resolve, reject);
    }
    state.pageCallIndex += 1;
    if (opts.failOnPageCall && state.pageCallIndex === opts.failOnPageCall) {
      return Promise.resolve({ data: null, error: { message: 'simulated page fetch failure' } }).then(resolve, reject);
    }
    const sorted = matched.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const [from, to] = rangeArgs || [0, sorted.length - 1];
    const page = sorted.slice(from, to + 1);
    return Promise.resolve({ data: page, error: null }).then(resolve, reject);
  };
  return chain;
}

const RECIPE_ROW = {
  id: 'r1',
  name: 'Garlic Broccoli',
  slug: 'garlic-broccoli',
  description: 'desc',
  cuisine: 'chinese',
  dish_type: 'side',
  difficulty: 'easy',
  prep_time_minutes: 5,
  cook_time_minutes: 7,
  base_servings: 3,
  image_url: null,
  calories_per_serving: 100,
  is_public: true,
  method: 'boiled',
  speed: 'normal',
  servings_unit: 'portion',
  meal_role: null,
  is_complete_meal: false,
  primary_protein: null,
  budget_level: null,
  reuse_group: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

function makeSupabaseServerMock(opts: {
  count: unknown;
  recipes: Array<Record<string, unknown>>;
  ingredientRows?: Array<Record<string, unknown>>;
  stepRows?: Array<Record<string, unknown>>;
  ingredientCountOverride?: number;
  stepCountOverride?: number;
  ingredientFailOnPageCall?: number;
  stepFailOnPageCall?: number;
}) {
  const fromCalls: string[] = [];
  const ingredientState = { pageCallIndex: 0 };
  const stepState = { pageCallIndex: 0 };
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    if (table === 'recipes') {
      return makeRecipesChain(opts.recipes, { count: opts.count });
    }
    if (table === 'recipe_ingredients') {
      return makeChildChain(
        opts.ingredientRows || [],
        { countOverride: opts.ingredientCountOverride, failOnPageCall: opts.ingredientFailOnPageCall },
        ingredientState,
      );
    }
    if (table === 'recipe_steps') {
      return makeChildChain(
        opts.stepRows || [],
        { countOverride: opts.stepCountOverride, failOnPageCall: opts.stepFailOnPageCall },
        stepState,
      );
    }
    return makeChain({ data: [], error: null });
  });
  return { from, fromCalls };
}

function mockSupabase(opts: Parameters<typeof makeSupabaseServerMock>[0]) {
  const mock = makeSupabaseServerMock(opts);
  vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: mock }));
  return mock;
}

beforeEach(() => {
  vi.resetModules();
  process.env.ADMIN_SECRET = ADMIN_SECRET;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.doUnmock('@/lib/supabaseServer');
  delete process.env.ADMIN_SECRET;
});

describe('admin recipes export API: fail closed without a service-role client', () => {
  it('returns 500 and calls no DB when supabaseServer is not configured', async () => {
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: null }));
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(500);
  });

  it('does not fall back to the public anon client', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).not.toMatch(/\|\|\s*supabase\b/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabaseClient['"]/);
  });
});

describe('admin recipes export API: auth and method gates', () => {
  it('returns 401 and calls no DB when the request is not admin', async () => {
    const mock = mockSupabase({ count: 0, recipes: [] });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: {} }), res);
    expect(res.statusCode).toBe(401);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('returns 405 for a non-GET method with zero DB calls', async () => {
    const mock = mockSupabase({ count: 0, recipes: [] });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ method: 'POST', headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(405);
    expect(mock.from).not.toHaveBeenCalled();
  });
});

describe('admin recipes export API: happy path', () => {
  it('returns the envelope with every field and correct download headers', async () => {
    const ingredientRows = [
      { id: 'ri-1', recipe_id: 'r1', quantity: 2, is_optional: false, prep_note: 'chopped', group_key: null, ingredients: { slug: 'broccoli' }, units: { code: 'piece' } },
    ];
    const stepRows = [
      { id: 's2', recipe_id: 'r1', step_no: 2, text: 'second', time_seconds: null },
      { id: 's1', recipe_id: 'r1', step_no: 1, text: 'first', time_seconds: 30 },
    ];
    mockSupabase({ count: 1, recipes: [RECIPE_ROW], ingredientRows, stepRows });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { format: string; version: number; exported_at: string; recipes: Array<Record<string, unknown>> };
    expect(body.format).toBe('prepmeal.recipe-export');
    expect(body.version).toBe(1);
    expect(typeof body.exported_at).toBe('string');
    expect(body.recipes).toHaveLength(1);

    const r = body.recipes[0];
    expect(r).toMatchObject({
      name: 'Garlic Broccoli',
      slug: 'garlic-broccoli',
      description: 'desc',
      cuisine: 'chinese',
      dish_type: 'side',
      difficulty: 'easy',
      prep_time: 5,
      cook_time: 7,
      servings: 3,
      calories_per_serving: 100,
      is_public: true,
      method: 'boiled',
      speed: 'normal',
      servings_unit: 'portion',
      is_complete_meal: false,
    });
    expect(r.ingredients).toEqual([
      { ingredient_slug: 'broccoli', unit_code: 'piece', quantity: 2, is_optional: false, notes: 'chopped', group_key: null },
    ]);
    // deterministic step ordering by step_no, regardless of query row order.
    expect(r.steps).toEqual([
      { step_no: 1, text: 'first', time_seconds: 30 },
      { step_no: 2, text: 'second', time_seconds: null },
    ]);

    expect(res.headers['Content-Disposition']).toMatch(/^attachment; filename="[^"]+\.json"$/);
  });

  it('never truncates: a full 200-recipe export returns all 200', async () => {
    const recipes = Array.from({ length: 200 }, (_, i) => ({ ...RECIPE_ROW, id: `r${i}`, slug: `slug-${i}` }));
    mockSupabase({ count: 200, recipes });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(200);
    const body = res.body as { recipes: unknown[] };
    expect(body.recipes).toHaveLength(200);
  });
});

describe('admin recipes export API: refuses rather than truncates beyond the bound', () => {
  it('returns a clear 400 error when the exportable count exceeds 200, without fetching rows', async () => {
    const mock = mockSupabase({ count: 201, recipes: [] });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error?: string }).error).toMatch(/200-recipe bound/);
    // only the cheap head-count call against `recipes`, never the full select.
    expect(mock.fromCalls).toEqual(['recipes']);
  });
});

// ---------------------------------------------------------------------------
// R3 fix (item 1): the root recipe count must be treated as valid only when
// it is a non-negative safe integer, `recipes` itself must be paginated (not
// a single unranged select), and the export must fail closed if the server
// caps the recipe response below its own claimed count -- even when that
// count is <= MAX_RECIPES.
// ---------------------------------------------------------------------------
describe('admin recipes export API: root recipe count validation and pagination (R3)', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a fractional number', 12.5],
    ['a negative number', -1],
  ])('returns 500 without fetching any recipe rows when the recipe count is %s', async (_label, count) => {
    const mock = mockSupabase({ count, recipes: [] });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(500);
    const body = res.body as { error?: string; recipes?: unknown };
    expect(body.error).toMatch(/[Ii]nvalid/);
    expect(body.recipes).toBeUndefined();
    expect(res.headers['Content-Disposition']).toBeUndefined();
    // only the head-count call -- never a `select('*')` on an unverified count.
    expect(mock.fromCalls).toEqual(['recipes']);
  });

  it('fails closed (500, no partial body/headers) when the recipe count is <= 200 but the server response falls short of it', async () => {
    // count says 150 (within the 200 bound), but only 90 recipe rows are
    // actually available from the paginated select -- a server-side data
    // shortfall, not merely a page-size artifact. Export must not silently
    // succeed with 90 recipes as if the catalogue only had 90.
    const recipes = Array.from({ length: 90 }, (_, i) => ({ ...RECIPE_ROW, id: `r${i}`, slug: `slug-${i}` }));
    mockSupabase({ count: 150, recipes });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(500);
    const body = res.body as { error?: string; recipes?: unknown };
    expect(body.error).toMatch(/Failed to load recipes/);
    expect(body.error).toMatch(/Row count mismatch/);
    expect(body.recipes).toBeUndefined();
    expect(res.headers['Content-Disposition']).toBeUndefined();
  });

  it('paginates the recipes select with an explicit range rather than one unranged select', async () => {
    const recipes = Array.from({ length: 3 }, (_, i) => ({ ...RECIPE_ROW, id: `r${i}`, slug: `slug-${i}` }));
    mockSupabase({ count: 3, recipes });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(200);
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).toMatch(/\.range\(/);
  });
});

// ---------------------------------------------------------------------------
// P1 regression: recipe_ingredients / recipe_steps must never be fetched with
// a single unpaginated `.in(...)` select. Production already has 1,178
// recipe_ingredients rows and 1,138 recipe_steps rows, both above PostgREST's
// common 1,000-row default cap. These tests exercise the real route wiring
// end to end (auth -> count -> paginated/chunked child fetch -> shape ->
// envelope), backed by an in-memory table mock that actually enforces the
// `.in(...)` id-chunk filter and the `.range(from, to)` page window, so a
// regression back to a single unranged `.in(...)` select would show up as a
// wrong/incomplete row count here.
// ---------------------------------------------------------------------------

function makeManyRecipes(n: number) {
  return Array.from({ length: n }, (_, i) => ({ ...RECIPE_ROW, id: `r${String(i).padStart(4, '0')}`, slug: `slug-${i}` }));
}

// Distributes `total` child rows across `recipeIds`, dumping a large uneven
// chunk (>500) onto the first recipe to force multiple 500-row server pages
// within a single 50-id chunk, and spreading the remainder thinly across the
// rest to force multiple id chunks.
function makeManyChildRows(recipeIds: string[], total: number, prefix: string, extraFields: Record<string, unknown> = {}) {
  const rows: Array<Record<string, unknown>> = [];
  let seq = 0;
  let remaining = total;
  const bigFirstChunk = Math.min(remaining, 620); // forces 2 pages of 500 within chunk 1
  for (let i = 0; i < bigFirstChunk; i += 1) {
    rows.push({ id: `${prefix}-${String(seq).padStart(6, '0')}`, recipe_id: recipeIds[0], ...extraFields });
    seq += 1;
  }
  remaining -= bigFirstChunk;
  let idx = 1;
  while (remaining > 0) {
    const recipeId = recipeIds[idx % recipeIds.length];
    rows.push({ id: `${prefix}-${String(seq).padStart(6, '0')}`, recipe_id: recipeId, ...extraFields });
    seq += 1;
    idx += 1;
    remaining -= 1;
  }
  return rows;
}

describe('admin recipes export API: paginated + chunked child-row fetch (P1 regression)', () => {
  it('collects all 1,178 recipe_ingredients rows and all 1,138 recipe_steps rows across multiple 50-id chunks and 500-row pages, with zero drops or duplicates', async () => {
    const recipes = makeManyRecipes(188); // current prod recipe count
    const recipeIds = recipes.map((r) => r.id);
    const ingredientRows = makeManyChildRows(recipeIds, 1178, 'ri', {
      quantity: 1,
      is_optional: false,
      prep_note: null,
      group_key: null,
      ingredients: { slug: 'x' },
      units: { code: 'u' },
    });
    const stepRows = makeManyChildRows(recipeIds, 1138, 'step', { step_no: 1, text: 't', time_seconds: null });

    const mock = mockSupabase({ count: 188, recipes, ingredientRows, stepRows });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { recipes: Array<{ ingredients: unknown[]; steps: unknown[] }> };
    expect(body.recipes).toHaveLength(188);

    const totalIngredients = body.recipes.reduce((sum, r) => sum + r.ingredients.length, 0);
    const totalSteps = body.recipes.reduce((sum, r) => sum + r.steps.length, 0);
    expect(totalIngredients).toBe(1178);
    expect(totalSteps).toBe(1138);

    // 188 ids / 50-id chunks = 4 chunks -> at least 4 count calls per table,
    // proving the `.in(...)` filter was actually chunked rather than sent as
    // one 188-id request.
    const ingredientFromCalls = mock.fromCalls.filter((t) => t === 'recipe_ingredients').length;
    const stepFromCalls = mock.fromCalls.filter((t) => t === 'recipe_steps').length;
    expect(ingredientFromCalls).toBeGreaterThanOrEqual(4 + 1); // >=4 count calls + >=1 extra page call (the 620-row first chunk needs 2 pages)
    expect(stepFromCalls).toBeGreaterThanOrEqual(4);
  });

  it('returns 500 and never emits a partial export body when an intermediate ingredient page errors', async () => {
    const recipes = makeManyRecipes(5);
    const recipeIds = recipes.map((r) => r.id);
    // 700 rows on one recipe forces 2 page fetches (500 + 200); fail the 2nd.
    const ingredientRows = makeManyChildRows([recipeIds[0]], 700, 'ri');

    mockSupabase({ count: 5, recipes, ingredientRows, ingredientFailOnPageCall: 2 });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);

    expect(res.statusCode).toBe(500);
    const body = res.body as { error?: string; recipes?: unknown };
    expect(body.error).toMatch(/Failed to load ingredients/);
    expect(body.recipes).toBeUndefined();
    // no download headers were ever set for a failed export.
    expect(res.headers['Content-Disposition']).toBeUndefined();
  });

  it('fails closed (500, no partial body) when the collected recipe_steps row count does not match the exact count PostgREST reported', async () => {
    const recipes = makeManyRecipes(3);
    const recipeIds = recipes.map((r) => r.id);
    // Only 5 real rows exist, but the count query is overridden to claim 50 --
    // simulating a server response that under-delivers relative to its own
    // reported exact count. Must fail rather than silently export 5 rows as
    // if the export were complete.
    const stepRows = makeManyChildRows([recipeIds[0]], 5, 'step');

    mockSupabase({ count: 3, recipes, stepRows, stepCountOverride: 50 });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);

    expect(res.statusCode).toBe(500);
    const body = res.body as { error?: string; recipes?: unknown };
    expect(body.error).toMatch(/Failed to load steps/);
    expect(body.error).toMatch(/Row count mismatch/);
    expect(body.recipes).toBeUndefined();
    expect(res.headers['Content-Disposition']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// R3 fix (item 3): a missing/blank/non-string joined ingredient_slug or
// unit_code must fail the whole export before any header/body is emitted --
// never serialize a null portable reference.
// ---------------------------------------------------------------------------
describe('admin recipes export API: portable-reference integrity (R3)', () => {
  it('fails closed (500, no partial body/headers) when an ingredient row has a missing ingredient slug join', async () => {
    const ingredientRows = [
      { id: 'ri-1', recipe_id: 'r1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: null, units: { code: 'piece' } },
    ];
    mockSupabase({ count: 1, recipes: [RECIPE_ROW], ingredientRows });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);

    expect(res.statusCode).toBe(500);
    const body = res.body as { error?: string; recipes?: unknown };
    expect(body.error).toMatch(/ingredient slug/i);
    expect(body.recipes).toBeUndefined();
    expect(res.headers['Content-Disposition']).toBeUndefined();
  });

  it('fails closed (500, no partial body/headers) when an ingredient row has a blank unit code join', async () => {
    const ingredientRows = [
      { id: 'ri-1', recipe_id: 'r1', quantity: 1, is_optional: false, prep_note: null, group_key: null, ingredients: { slug: 'broccoli' }, units: { code: '  ' } },
    ];
    mockSupabase({ count: 1, recipes: [RECIPE_ROW], ingredientRows });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() } }), res);

    expect(res.statusCode).toBe(500);
    const body = res.body as { error?: string; recipes?: unknown };
    expect(body.error).toMatch(/unit code/i);
    expect(body.recipes).toBeUndefined();
    expect(res.headers['Content-Disposition']).toBeUndefined();
  });
});
