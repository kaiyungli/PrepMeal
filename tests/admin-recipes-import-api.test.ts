import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Integration tests for src/pages/api/admin/recipes/import.js.
//
// Envelope validation and reference resolution are pure and exhaustively
// tested in tests/admin-recipe-import-resolve.test.ts. Here we assert the
// route wiring: auth/method/config gates with zero DB calls, exactly two
// batched reference lookups before any RPC work, exactly one canonical RPC
// per resolved recipe, bounded concurrency, stable ordering, mixed
// success/failure, and duplicate-slug handling.

const ADMIN_SECRET = 'test-admin-secret-for-regression';
const HANDLER_MODULE = '@/pages/api/admin/recipes/import.js';
const SRC = path.resolve(__dirname, '../src/pages/api/admin/recipes/import.js');

function validAdminCookie(): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(ts).digest('hex');
  return `admin_session=${ts}.${sig}`;
}

const EXPORT_FORMAT = 'prepmeal.recipe-export';
const EXPORT_VERSION = 1;

function envelope(recipes: unknown[], overrides: Record<string, unknown> = {}) {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exported_at: 't', recipes, ...overrides };
}

function validRecipe(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    name: `Recipe ${slug}`,
    slug,
    cuisine: 'chinese',
    dish_type: 'main',
    difficulty: 'easy',
    ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', quantity: 1 }],
    steps: [{ text: 'Cook' }],
    ...overrides,
  };
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    query: {},
    body: envelope([validRecipe('r1')]),
    headers: {},
    ...overrides,
  };
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

// A minimal chainable query-builder mock. `.select/.order/.eq/.in` all
// return the same chain object (records the call); the chain is itself
// thenable so `await supabase.from(x).select(...).in(...)` resolves to the
// canned result for that `.from()` call.
function makeChain(result: unknown) {
  const calls: Array<[string, unknown[]]> = [];
  const chain: Record<string, unknown> = { __calls: calls };
  for (const m of ['select', 'order', 'eq', 'in', 'single', 'maybeSingle']) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push([m, args]);
      return chain;
    });
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function makeSupabaseServerMock(opts: {
  ingredients?: Array<{ id: string; slug: string }>;
  units?: Array<{ id: string; code: string }>;
  rpc?: (name: string, params: Record<string, unknown>) => unknown;
}) {
  const fromCalls: string[] = [];
  const chainsByTable: Record<string, ReturnType<typeof makeChain>[]> = {};
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const result =
      table === 'ingredients'
        ? { data: opts.ingredients || [], error: null }
        : table === 'units'
          ? { data: opts.units || [], error: null }
          : { data: [], error: null };
    const chain = makeChain(result);
    chainsByTable[table] = chainsByTable[table] || [];
    chainsByTable[table].push(chain);
    return chain;
  });
  const rpc = vi.fn((name: string, params: Record<string, unknown>) =>
    opts.rpc ? opts.rpc(name, params) : Promise.resolve({ data: { recipe: { id: 'r1' }, ingredients: [], steps: [] }, error: null }),
  );
  return { from, rpc, fromCalls, chainsByTable };
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

describe('admin recipes import API: fail closed without a service-role client', () => {
  it('returns 500 and calls no DB / RPC when supabaseServer is not configured', async () => {
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: null }));
    const handler = await loadHandler();
    const req = makeReq({ headers: { cookie: validAdminCookie() } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
  });

  it('does not fall back to the public anon client', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).not.toMatch(/\|\|\s*supabase\b/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabaseClient['"]/);
  });
});

describe('admin recipes import API: auth and method gates', () => {
  it('returns 401 and calls no DB when the request is not admin', async () => {
    const mock = mockSupabase({});
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: {} }), res);
    expect(res.statusCode).toBe(401);
    expect(mock.from).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('returns 405 for a non-POST method with zero DB calls', async () => {
    const mock = mockSupabase({});
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ method: 'GET', headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(405);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('sets a 2mb Pages API bodyParser sizeLimit', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).toMatch(/export const config/);
    expect(src).toMatch(/sizeLimit:\s*['"]2mb['"]/);
  });

  it('performs no raw recipe/ingredient/step table inserts', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).not.toMatch(/\.insert\(/);
  });
});

describe('admin recipes import API: envelope validation before any lookup/RPC', () => {
  it('rejects a legacy raw array body with zero DB calls', async () => {
    const mock = mockSupabase({});
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() }, body: [validRecipe('r1')] }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error?: string }).error).toMatch(/legacy array/i);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('rejects an unknown format/version with zero DB calls', async () => {
    const mock = mockSupabase({});
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ headers: { cookie: validAdminCookie() }, body: envelope([validRecipe('r1')], { format: 'nope' }) }), res);
    expect(res.statusCode).toBe(400);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('rejects more than 200 recipes before any lookup/RPC work', async () => {
    const mock = mockSupabase({});
    const handler = await loadHandler();
    const res = makeRes();
    const recipes = Array.from({ length: 201 }, (_, i) => validRecipe(`r${i}`));
    await handler(makeReq({ headers: { cookie: validAdminCookie() }, body: envelope(recipes) }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error?: string }).error).toMatch(/maximum 200/);
    expect(mock.from).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});

describe('admin recipes import API: at most one batched query per reference table', () => {
  it('calls .from("ingredients") and .from("units") exactly once each, before any RPC, when both reference sets are non-empty', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({
        headers: { cookie: validAdminCookie() },
        body: envelope([validRecipe('r1'), validRecipe('r2')]),
      }),
      res,
    );
    expect(mock.fromCalls.filter((t) => t === 'ingredients')).toHaveLength(1);
    expect(mock.fromCalls.filter((t) => t === 'units')).toHaveLength(1);
    expect(mock.fromCalls).toHaveLength(2);
    expect(mock.rpc).toHaveBeenCalledTimes(2);
  });

  // R3 fix (item 4): an empty reference set must skip that table's lookup
  // entirely rather than calling `.in(field, [])`.
  it('skips both reference lookups for a recipe with no ingredients, and the RPC still succeeds with empty p_ingredients', async () => {
    const mock = mockSupabase({});
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({
        headers: { cookie: validAdminCookie() },
        body: envelope([validRecipe('no-ingredients', { ingredients: [] })]),
      }),
      res,
    );
    expect(mock.fromCalls).toEqual([]);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    const body = res.body as { results: Array<{ success: boolean }> };
    expect(body.results[0].success).toBe(true);
  });

  it('skips only the units lookup when every ingredient omits unit_code (ingredientSlugs non-empty, unitCodes empty)', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({
        headers: { cookie: validAdminCookie() },
        body: envelope([validRecipe('missing-unit-code', { ingredients: [{ ingredient_slug: 'broccoli' }] })]),
      }),
      res,
    );
    expect(mock.fromCalls).toEqual(['ingredients']);
    // the recipe still fails validation (missing unit_code), just never
    // because of a wasted/erroring `.in('code', [])` lookup.
    const body = res.body as { results: Array<{ success: boolean; error?: string }> };
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toMatch(/unit_code/);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});

// R3 fix (item 7): a thrown/rejected lookup promise (not a resolved
// `{ data, error }`) must still fail closed with the standard JSON 500, and
// crucially before any RPC is dispatched.
describe('admin recipes import API: error containment around the reference lookups', () => {
  it('returns 500 and dispatches no RPC when the ingredient lookup promise rejects', async () => {
    const mock = mockSupabase({
      units: [{ id: 'unit-1', code: 'piece' }],
    });
    mock.from.mockImplementationOnce(() => {
      throw new Error('connection pool exhausted');
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ headers: { cookie: validAdminCookie() }, body: envelope([validRecipe('r1'), validRecipe('r2')]) }),
      res,
    );
    expect(res.statusCode).toBe(500);
    const body = res.body as { error?: string; results?: unknown };
    expect(typeof body.error).toBe('string');
    expect(body.results).toBeUndefined();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});

// R3 fix (item 5): is_optional / notes / group_key on an ingredient are
// strictly validated at the route level too -- a wrong-typed supplied value
// fails that recipe with a clear error rather than being silently coerced.
describe('admin recipes import API: strict optional ingredient field validation', () => {
  it('a non-boolean is_optional fails only that recipe, before any RPC for it', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({
        headers: { cookie: validAdminCookie() },
        body: envelope([
          validRecipe('bad-is-optional', { ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', is_optional: 'true' }] }),
          validRecipe('good'),
        ]),
      }),
      res,
    );
    const body = res.body as { results: Array<{ success: boolean; error?: string }> };
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toMatch(/is_optional/);
    expect(body.results[1].success).toBe(true);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });

  it('a non-string notes value fails only that recipe', async () => {
    mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({
        headers: { cookie: validAdminCookie() },
        body: envelope([
          validRecipe('bad-notes', { ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'piece', notes: 5 }] }),
        ]),
      }),
      res,
    );
    const body = res.body as { results: Array<{ success: boolean; error?: string }> };
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toMatch(/notes/);
  });
});

describe('admin recipes import API: unknown reference fails only that recipe', () => {
  it('an unknown ingredient_slug/unit_code fails only that recipe; others still succeed via one RPC each', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({
        headers: { cookie: validAdminCookie() },
        body: envelope([
          validRecipe('good'),
          validRecipe('bad-ingredient', { ingredients: [{ ingredient_slug: 'nope', unit_code: 'piece', quantity: 1 }] }),
          validRecipe('bad-unit', { ingredients: [{ ingredient_slug: 'broccoli', unit_code: 'nope', quantity: 1 }] }),
        ]),
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
    const body = res.body as { total: number; success: number; failed: number; results: Array<{ slug: string; success: boolean; error?: string }> };
    expect(body.total).toBe(3);
    expect(body.success).toBe(1);
    expect(body.failed).toBe(2);
    expect(body.results[0]).toMatchObject({ slug: 'good', success: true });
    expect(body.results[1]).toMatchObject({ success: false });
    expect(body.results[1].error).toMatch(/Unknown ingredient_slug/);
    expect(body.results[2]).toMatchObject({ success: false });
    expect(body.results[2].error).toMatch(/Unknown unit_code/);
    // only ONE recipe resolved -> only ONE RPC call.
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });

  it('never auto-creates ingredients or units (no insert on those tables)', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).not.toMatch(/from\(['"]ingredients['"]\)\.insert/);
    expect(src).not.toMatch(/from\(['"]units['"]\)\.insert/);
  });
});

describe('admin recipes import API: exactly one canonical RPC per valid recipe', () => {
  it('calls admin_create_recipe_atomic once per resolved recipe with exactly the 22 canonical keys', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ headers: { cookie: validAdminCookie() }, body: envelope([validRecipe('r1'), validRecipe('r2')]) }),
      res,
    );
    expect(mock.rpc).toHaveBeenCalledTimes(2);
    for (const call of mock.rpc.mock.calls) {
      expect(call[0]).toBe('admin_create_recipe_atomic');
      const keys = Object.keys(call[1] as Record<string, unknown>).sort();
      expect(keys).toHaveLength(22);
      expect(Object.values(call[1] as Record<string, unknown>).some((v) => v === undefined)).toBe(false);
    }
  });
});

describe('admin recipes import API: bounded concurrency and stable ordering', () => {
  it('never has more than IMPORT_RPC_CONCURRENCY (8) RPC calls in flight at once', async () => {
    let active = 0;
    let maxActive = 0;
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
      rpc: async (_name, params) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return { data: { recipe: { id: (params as { p_slug: string }).p_slug } }, error: null };
      },
    });
    const handler = await loadHandler();
    const res = makeRes();
    const recipes = Array.from({ length: 30 }, (_, i) => validRecipe(`r${i}`));
    await handler(makeReq({ headers: { cookie: validAdminCookie() }, body: envelope(recipes) }), res);
    expect(mock.rpc).toHaveBeenCalledTimes(30);
    expect(maxActive).toBeLessThanOrEqual(8);
    expect(maxActive).toBeGreaterThan(1);
  });

  it('returns results in the same order as the input recipes regardless of RPC completion order', async () => {
    const delays: Record<string, number> = { r0: 30, r1: 5, r2: 20, r3: 1 };
    mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
      rpc: async (_name, params) => {
        const slug = (params as { p_slug: string }).p_slug;
        await new Promise((resolve) => setTimeout(resolve, delays[slug] ?? 1));
        return { data: { recipe: { id: slug } }, error: null };
      },
    });
    const handler = await loadHandler();
    const res = makeRes();
    const recipes = ['r0', 'r1', 'r2', 'r3'].map((s) => validRecipe(s));
    await handler(makeReq({ headers: { cookie: validAdminCookie() }, body: envelope(recipes) }), res);
    const body = res.body as { results: Array<{ slug: string }> };
    expect(body.results.map((r) => r.slug)).toEqual(['r0', 'r1', 'r2', 'r3']);
  });
});

describe('admin recipes import API: mixed success/failure batch', () => {
  it('a validation failure (unknown reference) and an RPC failure coexist with successes, preserving order', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
      rpc: async (_name, params) => {
        const slug = (params as { p_slug: string }).p_slug;
        if (slug === 'rpc-fail') return { data: null, error: { message: 'boom' } };
        return { data: { recipe: { id: slug } }, error: null };
      },
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({
        headers: { cookie: validAdminCookie() },
        body: envelope([
          validRecipe('ok-1'),
          validRecipe('unknown-ref', { ingredients: [{ ingredient_slug: 'nope', unit_code: 'piece', quantity: 1 }] }),
          validRecipe('rpc-fail'),
          validRecipe('ok-2'),
        ]),
      }),
      res,
    );
    const body = res.body as { total: number; success: number; failed: number; results: Array<{ slug: string; success: boolean }> };
    expect(body.total).toBe(4);
    expect(body.success).toBe(2);
    expect(body.failed).toBe(2);
    expect(body.results.map((r) => [r.slug, r.success])).toEqual([
      ['ok-1', true],
      ['unknown-ref', false],
      ['rpc-fail', false],
      ['ok-2', true],
    ]);
    expect(mock.rpc).toHaveBeenCalledTimes(3);
  });
});

describe('admin recipes import API: duplicate slug against an EXISTING database row (single occurrence in the batch)', () => {
  it('surfaces the RPC unique-violation as a clear Duplicate slug message; never upserts', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
      rpc: async (_name, params) => {
        const slug = (params as { p_slug: string }).p_slug;
        if (slug === 'already-in-db') {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "recipes_slug_key"' } };
        }
        return { data: { recipe: { id: slug } }, error: null };
      },
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ headers: { cookie: validAdminCookie() }, body: envelope([validRecipe('already-in-db')]) }),
      res,
    );
    const body = res.body as { results: Array<{ success: boolean; error?: string }> };
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toMatch(/Duplicate slug/);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });

  // R3 fix (item 8): the structured Postgres error code is preferred over
  // string-matching the message; the message here deliberately does NOT
  // match the compatibility-fallback regex, so this only passes if `.code`
  // is actually being checked.
  it('classifies a duplicate via error.code === "23505" even when the message text does not match the compatibility regex', async () => {
    mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
      rpc: async () => ({ data: null, error: { code: '23505', message: 'insert or update on table violates row-level policy' } }),
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ headers: { cookie: validAdminCookie() }, body: envelope([validRecipe('coded-dup')]) }),
      res,
    );
    const body = res.body as { results: Array<{ success: boolean; error?: string }> };
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toBe('Duplicate slug "coded-dup"');
  });
});

// R3 fix (item 6): duplicate canonical p_slug values WITHIN one batch must be
// detected deterministically, in input order, before any RPC is dispatched --
// only the first valid occurrence may ever reach the RPC pool.
describe('admin recipes import API: deterministic duplicate slugs within one batch', () => {
  it('only the first occurrence of a repeated slug reaches the RPC pool; later occurrences fail without any RPC call', async () => {
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
      rpc: async (_name, params) => ({ data: { recipe: { id: (params as { p_slug: string }).p_slug } }, error: null }),
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ headers: { cookie: validAdminCookie() }, body: envelope([validRecipe('dup'), validRecipe('dup'), validRecipe('dup')]) }),
      res,
    );
    const body = res.body as { results: Array<{ success: boolean; error?: string }> };
    expect(body.results[0].success).toBe(true);
    expect(body.results[1].success).toBe(false);
    expect(body.results[1].error).toMatch(/Duplicate slug/);
    expect(body.results[2].success).toBe(false);
    expect(body.results[2].error).toMatch(/Duplicate slug/);
    // exactly ONE RPC call for the whole batch -- the second/third duplicate
    // never entered the worker pool at all.
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });

  it('a deliberately skewed/delayed RPC still lets only the earliest valid occurrence win: later duplicates cannot race ahead', async () => {
    // If duplicate detection were still left to the RPC/DB layer (the old
    // behavior), giving the FIRST occurrence's RPC call a long artificial
    // delay while later occurrences resolve instantly would let a later
    // duplicate's RPC call complete (and appear to "win") before the first
    // one even reaches Postgres. With the batch-level fix, occurrences 2 and
    // 3 never dispatch an RPC call at all, so no delay on the single
    // dispatched call can change which occurrence succeeds.
    let rpcCallCount = 0;
    const mock = mockSupabase({
      ingredients: [{ id: 'ing-1', slug: 'broccoli' }],
      units: [{ id: 'unit-1', code: 'piece' }],
      rpc: async (_name, params) => {
        rpcCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 30)); // artificially slow
        return { data: { recipe: { id: (params as { p_slug: string }).p_slug } }, error: null };
      },
    });
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ headers: { cookie: validAdminCookie() }, body: envelope([validRecipe('race'), validRecipe('race'), validRecipe('race')]) }),
      res,
    );
    const body = res.body as { results: Array<{ success: boolean; error?: string }> };
    expect(rpcCallCount).toBe(1);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    // Deterministic regardless of the artificial delay: input-order first
    // occurrence succeeds, both later occurrences are the in-batch-duplicate
    // error, never an RPC result.
    expect(body.results[0].success).toBe(true);
    expect(body.results[1].success).toBe(false);
    expect(body.results[1].error).toMatch(/Duplicate slug/);
    expect(body.results[2].success).toBe(false);
    expect(body.results[2].error).toMatch(/Duplicate slug/);
  });
});
