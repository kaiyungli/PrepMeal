import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Integration tests for src/pages/api/admin/recipes/index.js.
//
// The handler is route orchestration only: auth, the service-role client,
// method routing, calling the shared pure validator
// `@/lib/adminRecipeAtomicParams`, and mapping RPC results to HTTP responses.
// The exhaustive input-validation matrix lives in
// tests/admin-recipe-atomic-params.test.ts -- here we only assert the wiring:
//   * fail closed (no service-role client) -> 500, no RPC, no anon fallback
//   * admin cookie gate -> 401, no RPC
//   * a valid POST / PUT reaches the correct RPC with the exact 22 / 23 keys
//   * a validation failure -> 400 before the RPC (representative cases)
//   * an RPC error is never reported as success
//   * DELETE contract

const ADMIN_SECRET = 'test-admin-secret-for-regression';
const HANDLER_MODULE = '@/pages/api/admin/recipes/index.js';
const SRC = path.resolve(__dirname, '../src/pages/api/admin/recipes/index.js');

function validAdminCookie(): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(ts).digest('hex');
  return `admin_session=${ts}.${sig}`;
}

// Minimal body that PASSES the shared validator: the five NOT-NULL /
// product-required fields.
const VALID_MIN_BODY = {
  name: 'Test Recipe',
  slug: 'test-recipe',
  cuisine: 'chinese',
  dish_type: 'main',
  difficulty: 'easy',
};

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    query: {},
    body: { ...VALID_MIN_BODY },
    headers: {},
    ...overrides,
  };
}

function makeRes() {
  const res: {
    statusCode: number | null;
    body: unknown;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  } = { statusCode: null, body: undefined, status: vi.fn(), json: vi.fn() };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

async function loadHandler() {
  const mod = await import(HANDLER_MODULE);
  return mod.default as (req: unknown, res: unknown) => Promise<unknown>;
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

describe('admin recipes API: fail closed without a service-role client', () => {
  it('returns 500 and never calls an RPC when supabaseServer is not configured', async () => {
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: null }));

    const handler = await loadHandler();
    const req = makeReq({ headers: { cookie: validAdminCookie() } });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect((res.body as { error?: string })?.error).toBe('Admin API is not configured');
  });

  it('does not fall back to the public anon client (no such import / fallback in source)', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).not.toMatch(/\|\|\s*supabase\b/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabaseClient['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    expect(src).toMatch(/requireAdmin/);
    expect(src).toMatch(/const\s+db\s*=\s*supabaseServer\b/);
  });
});

describe('admin recipes API: request validation is delegated to the shared pure helper', () => {
  it('index.js imports buildRecipeAtomicParams from @/lib/adminRecipeAtomicParams and calls it', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    expect(src).toMatch(
      /import\s*\{[^}]*\bbuildRecipeAtomicParams\b[^}]*\}\s*from\s*['"]@\/lib\/adminRecipeAtomicParams['"]/,
    );
    expect(src).toMatch(/buildRecipeAtomicParams\s*\(\s*body\s*\)/);
    // the enum constants / validation helpers are no longer inlined in the route
    expect(src).not.toMatch(/const\s+CUISINES\s*=/);
    expect(src).not.toMatch(/function\s+buildRecipeAtomicParams\b/);
  });
});

describe('admin recipes API: admin cookie gate is retained', () => {
  it('returns 401 and calls no RPC when the service-role client exists but the request is not admin', async () => {
    const rpc = vi.fn();
    vi.doMock('@/lib/supabaseServer', () => ({
      supabaseServer: { rpc, from: () => ({ select: () => ({ order: () => ({ data: [], error: null }) }) }) },
    }));

    const handler = await loadHandler();
    const req = makeReq({ headers: {} });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Wiring: valid request -> correct RPC with the exact canonical key set.
// ---------------------------------------------------------------------------

const CREATE_RPC_KEYS = [
  'p_name', 'p_slug', 'p_description', 'p_cuisine', 'p_dish_type', 'p_difficulty',
  'p_prep_time_minutes', 'p_cook_time_minutes', 'p_base_servings', 'p_image_url',
  'p_calories_per_serving', 'p_is_public', 'p_method', 'p_speed', 'p_servings_unit',
  'p_meal_role', 'p_is_complete_meal', 'p_primary_protein', 'p_budget_level',
  'p_reuse_group', 'p_ingredients', 'p_steps',
].sort();
const UPDATE_RPC_KEYS = [...CREATE_RPC_KEYS, 'p_recipe_id'].sort();
const RECIPE_UUID = '11111111-1111-1111-1111-111111111111';

const FULL_BODY = {
  ...VALID_MIN_BODY,
  description: 'A quick side',
  prep_time: 5,
  cook_time: 7,
  servings: 3,
  image_url: 'http://example.test/a.jpg',
  calories_per_serving: 120,
  is_public: false,
  method: 'braised',
  speed: 'slow',
  servings_unit: 'plate',
  meal_role: 'protein_side',
  is_complete_meal: true,
  primary_protein: 'beef',
  budget_level: 'premium',
  reuse_group: 'g1',
  ingredients: [{ ingredient_id: 'i1', quantity: 2, unit_id: 'u1', is_optional: true, notes: 'n', group_key: null }],
  steps: [{ step_no: 1, text: 't', time_seconds: 30 }],
};

function mockRpc(impl?: (name: string, params: Record<string, unknown>) => unknown) {
  const rpc = vi.fn().mockImplementation((name: string, params: Record<string, unknown>) =>
    impl
      ? impl(name, params)
      : Promise.resolve({ data: { recipe: { id: 'r1' }, ingredients: [], steps: [] }, error: null }),
  );
  vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: { rpc } }));
  return rpc;
}

const paramsOf = (rpc: ReturnType<typeof vi.fn>) => rpc.mock.calls[0][1] as Record<string, unknown>;
const errOf = (res: ReturnType<typeof makeRes>) => (res.body as { error?: string })?.error;

async function runPost(body: unknown, rpcImpl?: Parameters<typeof mockRpc>[0]) {
  const rpc = mockRpc(rpcImpl);
  const handler = await loadHandler();
  const res = makeRes();
  await handler(makeReq({ headers: { cookie: validAdminCookie() }, body }), res);
  return { rpc, res };
}

async function runPut(
  body: unknown,
  query: Record<string, unknown> = { id: RECIPE_UUID },
  rpcImpl?: Parameters<typeof mockRpc>[0],
) {
  const rpc = mockRpc(rpcImpl);
  const handler = await loadHandler();
  const res = makeRes();
  await handler(makeReq({ method: 'PUT', query, headers: { cookie: validAdminCookie() }, body }), res);
  return { rpc, res };
}

describe('admin recipes API: valid request -> canonical RPC', () => {
  it('POST -> admin_create_recipe_atomic with exactly the 22 canonical keys, 201', async () => {
    const { rpc, res } = await runPost(FULL_BODY);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('admin_create_recipe_atomic');
    expect(Object.keys(paramsOf(rpc)).sort()).toEqual(CREATE_RPC_KEYS);
    expect(res.statusCode).toBe(201);
  });

  it('POST params have no undefined and JSON round-trip to exactly 22 keys', async () => {
    const { rpc } = await runPost(FULL_BODY);
    const p = paramsOf(rpc);
    expect(Object.values(p).some((v) => v === undefined)).toBe(false);
    expect(Object.keys(JSON.parse(JSON.stringify(p))).sort()).toEqual(CREATE_RPC_KEYS);
  });

  it('PUT (?id=) -> admin_update_recipe_atomic with exactly the 23 canonical keys incl p_recipe_id, 200', async () => {
    const { rpc, res } = await runPut(FULL_BODY);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('admin_update_recipe_atomic');
    const p = paramsOf(rpc);
    expect(Object.keys(p).sort()).toEqual(UPDATE_RPC_KEYS);
    expect(p.p_recipe_id).toBe(RECIPE_UUID);
    expect(Object.values(p).some((v) => v === undefined)).toBe(false);
    expect(res.statusCode).toBe(200);
  });

  it('POST forwards the shared helper output verbatim (spot-check metadata + fail-safe is_public)', async () => {
    const { rpc } = await runPost({ ...VALID_MIN_BODY, method: 'baked', meal_role: 'soup', is_complete_meal: false });
    const p = paramsOf(rpc);
    expect(p.p_method).toBe('baked');
    expect(p.p_meal_role).toBe('soup');
    expect(p.p_is_complete_meal).toBe(false);
    expect(p.p_is_public).toBe(false); // absent -> fail-safe
  });
});

describe('admin recipes API: a validation failure short-circuits before the RPC', () => {
  it.each([
    ['non-object body', 'not-an-object', 'Invalid request body'],
    ['unknown cuisine', { ...VALID_MIN_BODY, cuisine: 'martian' }, 'Invalid value for "cuisine"'],
    ['blank name', { ...VALID_MIN_BODY, name: '   ' }, 'Invalid value for "name"'],
    ['fractional calories_per_serving', { ...VALID_MIN_BODY, calories_per_serving: 320.5 }, 'Invalid value for "calories_per_serving"'],
    ['fractional calories string', { ...VALID_MIN_BODY, calories_per_serving: '320.5' }, 'Invalid value for "calories_per_serving"'],
    ['non-string optional text (description)', { ...VALID_MIN_BODY, description: 123 }, 'Invalid value for "description"'],
    ['non-string optional text (image_url)', { ...VALID_MIN_BODY, image_url: { u: 1 } }, 'Invalid value for "image_url"'],
    ['non-array ingredients', { ...VALID_MIN_BODY, ingredients: 'nope' }, 'Invalid value for "ingredients"'],
    ['"false" string is_public', { ...VALID_MIN_BODY, is_public: 'false' }, 'Invalid value for "is_public"'],
    ['servings 0 (live CHECK)', { ...VALID_MIN_BODY, servings: 0 }, 'Invalid value for "servings"'],
  ])('POST: %s -> 400 with the generic message, no RPC', async (_label, body, expected) => {
    const { rpc, res } = await runPost(body);
    expect(res.statusCode).toBe(400);
    expect(errOf(res)).toBe(expected);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('PUT: fractional calories -> 400, no RPC', async () => {
    const { rpc, res } = await runPut({ ...VALID_MIN_BODY, calories_per_serving: 1.5 });
    expect(res.statusCode).toBe(400);
    expect(errOf(res)).toBe('Invalid value for "calories_per_serving"');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('PUT: non-string optional text -> 400, no RPC', async () => {
    const { rpc, res } = await runPut({ ...VALID_MIN_BODY, reuse_group: ['x'] });
    expect(res.statusCode).toBe(400);
    expect(errOf(res)).toBe('Invalid value for "reuse_group"');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('PUT without an id -> 400 and no RPC', async () => {
    const { rpc, res } = await runPut(FULL_BODY, {});
    expect(res.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('admin recipes API: an RPC error is never reported as success', () => {
  it('POST: RPC { error } -> 500, generic message, RPC was reached', async () => {
    const { rpc, res } = await runPost(FULL_BODY, () =>
      Promise.resolve({ data: null, error: { message: 'duplicate key value violates unique constraint "recipes_slug_key"' } }),
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(500);
    expect(errOf(res)).toMatch(/Failed to create recipe/);
  });

  it('PUT: RPC { error } -> 500, RPC was reached', async () => {
    const { rpc, res } = await runPut(FULL_BODY, { id: RECIPE_UUID }, () =>
      Promise.resolve({ data: null, error: { message: 'admin_update_recipe_atomic: recipe ... not found' } }),
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(500);
    expect(errOf(res)).toMatch(/Failed to update recipe/);
  });

  it('POST: RPC resolves with no data -> 500', async () => {
    const { rpc, res } = await runPost(FULL_BODY, () => Promise.resolve({ data: null, error: null }));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(500);
  });
});

describe('admin recipes API: DELETE contract', () => {
  it('DELETE -> admin_delete_recipe_atomic with only { p_recipe_id }; 200 on { success: true }', async () => {
    const rpc = mockRpc(() => Promise.resolve({ data: { success: true }, error: null }));
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ method: 'DELETE', query: { id: RECIPE_UUID }, headers: { cookie: validAdminCookie() } }),
      res,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('admin_delete_recipe_atomic');
    expect(Object.keys(paramsOf(rpc))).toEqual(['p_recipe_id']);
    expect(paramsOf(rpc).p_recipe_id).toBe(RECIPE_UUID);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, deletedId: RECIPE_UUID });
  });

  it('DELETE without an id -> 400, no RPC', async () => {
    const rpc = mockRpc();
    const handler = await loadHandler();
    const res = makeRes();
    await handler(makeReq({ method: 'DELETE', query: {}, headers: { cookie: validAdminCookie() } }), res);
    expect(res.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('DELETE: RPC returns { success: false } -> 500', async () => {
    const rpc = mockRpc(() => Promise.resolve({ data: { success: false }, error: null }));
    const handler = await loadHandler();
    const res = makeRes();
    await handler(
      makeReq({ method: 'DELETE', query: { id: RECIPE_UUID }, headers: { cookie: validAdminCookie() } }),
      res,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(500);
  });
});
