import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DELETE /api/user/menus/[id] contract:
// - unauthenticated, whatever the id → 401, no database access
// - a route id that isn't a uuid → 404 "Plan not found" before any database query
// - the owner's row deleted → 200 { deleted: true }
// - zero rows deleted (missing, or another user's plan hidden by RLS) → 404, never deleted: true
// - a returned database error or a thrown exception → 500 "Failed to delete plan",
//   logged server-side, with nothing from the error in the response
//
// Real path: handler → createUserSupabaseClient → supabase-js → fetch.
// Only auth and the network (or, for thrown cases, the client) are faked.

const { requireAuthMock, clientOverride, realAuth } = vi.hoisted(() => {
  // _auth.js builds its JWKS URL and a shared client from these at import time.
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-secret-xyz789';
  return {
    requireAuthMock: vi.fn(),
    clientOverride: { current: null as null | (() => unknown) },
    realAuth: { requireAuth: null as null | ((req: unknown, res: unknown) => Promise<string | null>) },
  };
});

vi.mock('../src/pages/api/user/_auth.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  realAuth.requireAuth = actual.requireAuth as typeof realAuth.requireAuth;
  return { ...actual, requireAuth: requireAuthMock };
});
vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<{ createClient: (...args: unknown[]) => unknown }>();
  return { ...actual, createClient: (...args: unknown[]) => (clientOverride.current ? clientOverride.current() : actual.createClient(...args)) };
});

import handler from '../src/pages/api/user/menus/[id].js';

const PLAN_ID = '5d2f6a0e-8c1b-4e7a-9f3d-2b6c8e1a4f70';
const OWNER_ID = 'a1b2c3d4-0000-4000-8000-000000000001';
const TOKEN = 'secret-user-token-abc123';
const ANON_KEY = 'anon-key-secret-xyz789';
const GENERIC = { success: false, error: 'Failed to delete plan' };
const NOT_FOUND = { success: false, error: 'Plan not found' };

// PostgREST error bodies. Every field holds text that must never reach the client.
const COLUMN_ERROR = { code: '42703', message: 'column menu_plans.user_idx does not exist', details: 'DELETE FROM public.menu_plans', hint: 'Perhaps you meant to reference the column "menu_plans.user_id".' };
const TIMEOUT_ERROR = { code: '57014', message: 'canceling statement due to statement timeout', details: 'statement_timeout=8s on pooler-internal-7', hint: 'raise statement_timeout' };
const PERMISSION_ERROR = { code: '42501', message: 'permission denied for table menu_plans', details: 'row-level security policy "delete own menu plans"', hint: null };
const THROWN_MESSAGE = 'connection terminated unexpectedly host=db.internal.example:5432 relation "public.menu_plans"';
const INTERNAL_TEXT = ['42703', '57014', '42501', 'column', 'statement', 'permission', 'menu_plans', 'row-level', 'pooler', 'db.internal', '5432', '10.0.0.5', 'ECONNREFUSED', 'fetch failed', 'relation'];

type Call = { url: string; method?: string };
let fetchCalls: Call[];
let fetchImpl: () => Promise<Response>;
let errorLog: ReturnType<typeof vi.spyOn>;

const jsonResponse = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function response() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

async function del(id: unknown, headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` }) {
  const res = response();
  await handler({ method: 'DELETE', headers, query: { id } } as never, res as never);
  return res;
}

function expectNoInternalText(body: unknown) {
  const text = JSON.stringify(body);
  for (const fragment of INTERNAL_TEXT) expect(text).not.toContain(fragment);
}

function loggedText() {
  return errorLog.mock.calls.map((args: unknown[]) => inspect(args, { depth: Infinity })).join('\n');
}

// A client whose DELETE chain rejects instead of resolving with { error }.
function rejectingClient() {
  const query: Record<string, unknown> = {};
  query.eq = () => query;
  query.select = () => Promise.reject(new Error(THROWN_MESSAGE));
  return { from: () => ({ delete: () => query }) };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
  fetchCalls = [];
  fetchImpl = jsonResponse(200, [{ id: PLAN_ID }]);
  clientOverride.current = null;
  requireAuthMock.mockReset().mockResolvedValue(OWNER_ID);
  vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), method: init?.method });
    return fetchImpl();
  }));
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DELETE /api/user/menus/[id] success and zero rows', () => {
  it('A. returns 200 deleted:true only after the owner row comes back', async () => {
    const res = await del(PLAN_ID);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { deleted: true } });
    expect(fetchCalls).toHaveLength(1);
    const url = new URL(fetchCalls[0].url);
    expect(fetchCalls[0].method).toBe('DELETE');
    expect(url.pathname).toBe('/rest/v1/menu_plans');
    expect(url.searchParams.get('id')).toBe(`eq.${PLAN_ID}`);
    expect(url.searchParams.get('user_id')).toBe(`eq.${OWNER_ID}`);
    expect(url.searchParams.get('select')).toBe('id');
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('accepts an uppercase uuid, as GET does', async () => {
    const res = await del(PLAN_ID.toUpperCase());
    expect(res.statusCode).toBe(200);
    expect(fetchCalls).toHaveLength(1);
  });

  it.each([
    ['B. missing plan'],
    ['C. another user\'s plan hidden by RLS'],
  ])('%s → zero rows → 404, never deleted:true', async () => {
    fetchImpl = jsonResponse(200, []);
    const res = await del(PLAN_ID);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual(NOT_FOUND);
    expect(JSON.stringify(res.body)).not.toContain('deleted');
    expect(fetchCalls).toHaveLength(1);
    expect(errorLog).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/user/menus/[id] auth and id validation', () => {
  it.each([
    ['D. valid uuid', PLAN_ID],
    ['E. malformed id', 'not-a-uuid'],
  ])('%s without a token → 401 and no database access', async (_label, id) => {
    requireAuthMock.mockImplementation((req, res) => realAuth.requireAuth!(req, res));
    const res = await del(id, {});
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ success: false, error: 'Unauthorized - please log in' });
    expect(fetchCalls).toHaveLength(0);
  });

  it.each([
    ['F. not-a-uuid', 'not-a-uuid'],
    ['plan-1', 'plan-1'],
    ['empty string', ''],
    ['G. array id', [PLAN_ID, PLAN_ID]],
    ['missing id', undefined],
    ['unhyphenated', PLAN_ID.replace(/-/g, '')],
    ['trailing character', `${PLAN_ID}x`],
    ['trailing newline', `${PLAN_ID}\n`],
    ['too short', PLAN_ID.slice(0, -1)],
  ])('%s → 404 before the database, nothing logged', async (_label, id) => {
    const res = await del(id);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual(NOT_FOUND);
    expect(fetchCalls).toHaveLength(0);
    expect(errorLog).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/user/menus/[id] failures are generic 500s', () => {
  it.each([
    ['H. 42703 column error', 400, COLUMN_ERROR],
    ['I. 57014 timeout', 500, TIMEOUT_ERROR],
    ['J. 42501 permission/RLS error', 403, PERMISSION_ERROR],
  ])('%s → 500 generic, raw fields absent, original logged', async (_label, status, error) => {
    fetchImpl = jsonResponse(status, error);
    const res = await del(PLAN_ID);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(GENERIC);
    expectNoInternalText(res.body);
    expect(errorLog).toHaveBeenCalledWith('[menus-api] delete_plan_error', {
      planId: PLAN_ID,
      error: expect.objectContaining({ code: error.code, message: error.message }),
    });
  });

  it('K. network failure (supabase-js resolves with an error) → 500 generic', async () => {
    fetchImpl = async () => {
      throw new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED 10.0.0.5:5432') });
    };
    const res = await del(PLAN_ID);
    expect(fetchCalls).toHaveLength(1);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(GENERIC);
    expectNoInternalText(res.body);
    expect(errorLog).toHaveBeenCalledWith('[menus-api] delete_plan_error', expect.objectContaining({ planId: PLAN_ID }));
    expect(loggedText()).toContain('fetch failed');
  });

  it('L. DELETE query promise rejects → 500 generic, exception logged', async () => {
    clientOverride.current = rejectingClient;
    const res = await del(PLAN_ID);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(GENERIC);
    expectNoInternalText(res.body);
    expect(errorLog).toHaveBeenCalledWith('[menus-api] delete_plan_exception', {
      planId: PLAN_ID,
      error: expect.objectContaining({ message: THROWN_MESSAGE }),
    });
  });

  it('M. createUserSupabaseClient throws → 500 generic, exception logged', async () => {
    clientOverride.current = () => { throw new Error(`supabaseUrl is required. ${THROWN_MESSAGE}`); };
    const res = await del(PLAN_ID);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(GENERIC);
    expectNoInternalText(res.body);
    expect(fetchCalls).toHaveLength(0);
    expect(errorLog).toHaveBeenCalledWith('[menus-api] delete_plan_exception', {
      planId: PLAN_ID,
      error: expect.objectContaining({ message: expect.stringContaining(THROWN_MESSAGE) }),
    });
  });

  it('N. requireAuth throws → 500 generic, no raw exception text', async () => {
    requireAuthMock.mockRejectedValue(new Error(`JWKS fetch failed ${THROWN_MESSAGE}`));
    const res = await del(PLAN_ID);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(GENERIC);
    expectNoInternalText(res.body);
    expect(fetchCalls).toHaveLength(0);
    expect(errorLog).toHaveBeenCalledWith('[menus-api] delete_plan_exception', {
      planId: PLAN_ID,
      error: expect.objectContaining({ message: expect.stringContaining(THROWN_MESSAGE) }),
    });
  });

  it.each([
    ['returned PostgREST error', () => { fetchImpl = jsonResponse(400, COLUMN_ERROR); }],
    ['network failure', () => { fetchImpl = async () => { throw new TypeError('fetch failed'); }; }],
    ['rejected query', () => { clientOverride.current = rejectingClient; }],
  ])('O. %s: log keeps the original error but no token, anon key or auth header', async (_label, arrange) => {
    arrange();
    await del(PLAN_ID);
    expect(errorLog).toHaveBeenCalled();
    const logged = loggedText();
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(ANON_KEY);
    expect(logged.toLowerCase()).not.toContain('bearer');
    expect(logged.toLowerCase()).not.toContain('authorization');
  });
});
