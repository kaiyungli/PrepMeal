import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Regression tests for src/pages/api/admin/recipes/index.js
//
// The admin recipe endpoint runs privileged, RLS-bypassing RPCs
// (admin_create_recipe_atomic / _update_ / _delete_). It must therefore ONLY
// ever talk to Supabase through the service-role client and must fail closed
// -- returning 500 without touching any RPC -- when that client is not
// configured. It must never fall back to the public anon client.
//
// These tests drive the handler with fake req/res objects and a mocked
// `@/lib/supabaseServer`, asserting:
//   * no service-role client  -> 500 "Admin API is not configured", no RPC
//   * service-role client present but no admin cookie -> 401, no RPC
//   * service-role client + valid admin cookie -> the RPC IS invoked
//     (positive control: proves the harness would observe an RPC call)
//   * the source no longer imports the anon client or keeps a `|| supabase`
//     fallback

const ADMIN_SECRET = 'test-admin-secret-for-regression';
const HANDLER_MODULE = '@/pages/api/admin/recipes/index.js';

function validAdminCookie(): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(ts).digest('hex');
  return `admin_session=${ts}.${sig}`;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    query: {},
    body: { name: 'Test Recipe', slug: 'test-recipe' },
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
  } = {
    statusCode: null,
    body: undefined,
    status: vi.fn(),
    json: vi.fn(),
  };
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

    // 500 with the specific pre-auth / pre-RPC guard message. This message is
    // only produced by the `if (!db)` branch, so seeing it proves the handler
    // short-circuited before any RPC (and before the auth check).
    expect(res.statusCode).toBe(500);
    expect((res.body as { error?: string })?.error).toBe('Admin API is not configured');
  });

  it('does not fall back to the public anon client (no such import / fallback in source)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/api/admin/recipes/index.js'),
      'utf8',
    );
    expect(src).not.toMatch(/\|\|\s*supabase\b/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabaseClient['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    // still gated by the admin cookie check
    expect(src).toMatch(/requireAdmin/);
    // db is bound directly to the service-role client
    expect(src).toMatch(/const\s+db\s*=\s*supabaseServer\b/);
  });
});

describe('admin recipes API: admin cookie gate is retained', () => {
  it('returns 401 and calls no RPC when the service-role client exists but the request is not admin', async () => {
    const rpc = vi.fn();
    vi.doMock('@/lib/supabaseServer', () => ({
      supabaseServer: {
        rpc,
        from: () => ({ select: () => ({ order: () => ({ data: [], error: null }) }) }),
      },
    }));

    const handler = await loadHandler();
    const req = makeReq({ headers: {} }); // no admin_session cookie
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('admin recipes API: positive control', () => {
  it('invokes admin_create_recipe_atomic through the service-role client for an authorized POST', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { recipe: { id: 'r1' }, ingredients: [], steps: [] },
      error: null,
    });
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: { rpc } }));

    const handler = await loadHandler();
    const req = makeReq({ headers: { cookie: validAdminCookie() } });
    const res = makeRes();

    await handler(req, res);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('admin_create_recipe_atomic');
    expect(res.statusCode).toBe(201);
  });
});
