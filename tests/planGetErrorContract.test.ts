// @vitest-environment jsdom
import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { NextApiRequest, NextApiResponse } from 'next';

// GET /api/user/menus/[id] error contract:
// - plan missing or not this user's (PGRST116 from .single()) → 404 "Plan not found"
// - any plan/items/recipes query failure, or a thrown exception → 500 "Failed to load plan",
//   logged server-side, with nothing from the database error in the response
// - a recipe query that succeeds but omits rows (RLS) is not an error: 200, and
//   the item reaches the page as unavailable (PR #46)
//
// Real path: getMenuPlanDetail → /api/user/menus/[id] → getPlanDetail → usePlanDetailController.
// Only Supabase and auth are faked.

const { requireAuthMock, createClientMock } = vi.hoisted(() => {
  // _auth.js builds its JWKS URL from this at import time.
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  return { requireAuthMock: vi.fn(), createClientMock: vi.fn() };
});

vi.mock('../src/pages/api/user/_auth.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requireAuth: requireAuthMock,
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import menuDetailHandler from '../src/pages/api/user/menus/[id].js';
import { getMenuPlanDetail } from '../src/features/plans/server/getMenuPlanDetail';
import { usePlanDetailController } from '../src/features/plans';

const TOKEN = 'secret-user-token-abc123';
const ANON_KEY = 'anon-key-secret-xyz789';
const RECIPE_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const RECIPE_B = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const RECIPES = {
  [RECIPE_A]: { id: RECIPE_A, name: '番茄炒蛋', image_url: null, total_time_minutes: 10, difficulty: 'easy', method: 'stir_fry' },
  [RECIPE_B]: { id: RECIPE_B, name: '蒸豆腐', image_url: null, total_time_minutes: 15, difficulty: 'easy', method: 'steamed' },
};
const PLAN = { id: 'plan-1', user_id: 'user-1', title: 'Saved', start_date: '2026-10-05', end_date: '2026-10-11', created_at: '2026-10-01' };
const ROWS = [
  { date: '2026-10-05', meal_slot: 'breakfast', recipe_id: RECIPE_A },
  { date: '2026-10-05', meal_slot: 'dinner', recipe_id: RECIPE_B },
  { date: '2026-10-06', meal_slot: 'snack', recipe_id: RECIPE_A },
].map((row, index) => ({ id: `item-${index}`, menu_plan_id: 'plan-1', servings: 2, item_order: index, source: 'generated', ...row }));

// Supabase-shaped errors. Every field holds text that must never reach the client.
const COLUMN_ERROR = { code: '42703', message: 'column recipes.method does not exist', details: 'SELECT id, name, method FROM public.recipes', hint: 'Perhaps you meant to reference the column "recipes.methods".' };
const TIMEOUT_ERROR = { code: '57014', message: 'canceling statement due to statement timeout', details: 'statement_timeout=8s on pooler-internal-7', hint: 'raise statement_timeout' };
// postgrest-js resolves (does not throw) with this shape when fetch fails.
const FETCH_ERROR = { code: '', message: 'TypeError: fetch failed', details: 'TypeError: fetch failed\n\nCaused by: Error: connect ECONNREFUSED 10.0.0.5:5432 (ECONNREFUSED)', hint: '' };
const NOT_FOUND_ERROR = { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object', details: 'The result contains 0 rows', hint: null };
const THROWN_MESSAGE = 'connection terminated unexpectedly host=db.internal.example:5432 relation "public.menu_plan_items"';

type Result = { data: unknown; error: unknown };
type Step = () => Promise<Result>;
let planStep: Step;
let itemsStep: Step;
let recipesStep: (ids: string[]) => Promise<Result>;

const ok = (data: unknown): Step => async () => ({ data, error: null });
const fail = (error: unknown): Step => async () => ({ data: null, error });
const visibleRecipes = (ids: string[]) => [...new Set(ids)].map((id) => RECIPES[id as keyof typeof RECIPES]);

function fakeSupabase() {
  return {
    from: (table: string) => {
      if (table === 'menu_plans') return { select: () => ({ eq: () => ({ eq: () => ({ single: () => planStep() }) }) }) };
      if (table === 'menu_plan_items') return { select: () => ({ eq: () => ({ order: () => ({ order: () => itemsStep() }) }) }) };
      if (table === 'recipes') return { select: () => ({ in: (_c: string, ids: string[]) => recipesStep(ids) }) };
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

async function get(planId = 'plan-1') {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    // Serialise like a real response: undefined-valued keys are dropped.
    json(body: unknown) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  };
  await (menuDetailHandler as never as (req: NextApiRequest, res: NextApiResponse) => Promise<void>)(
    { method: 'GET', query: { id: planId }, headers: { authorization: `Bearer ${TOKEN}` } } as unknown as NextApiRequest,
    res as unknown as NextApiResponse,
  );
  return res as { statusCode: number; body: { success: boolean; error?: string; data?: { items: Array<Record<string, unknown>> } } };
}

async function routeFetch(url: string) {
  const match = url.match(/^\/api\/user\/menus\/([^/?]+)$/);
  if (!match) throw new Error(`Unexpected fetch: ${url}`);
  const res = await get(match[1]);
  return { ok: res.statusCode < 400, status: res.statusCode, json: async () => res.body };
}

async function loadController() {
  const { result } = renderHook(() => usePlanDetailController({
    planId: 'plan-1', isAuthenticated: true, userId: 'user-1', getAccessToken: async () => TOKEN,
  }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result.current;
}

function expectGeneric500(res: Awaited<ReturnType<typeof get>>, leaked: Array<string | null | undefined>) {
  expect(res.statusCode).toBe(500);
  expect(res.body).toEqual({ success: false, error: 'Failed to load plan' });
  const body = JSON.stringify(res.body);
  for (const text of leaked) if (text) expect(body).not.toContain(text);
  for (const text of ['recipes', 'menu_plan', 'column', 'ECONNREFUSED', '5432', 'timeout', 'PGRST', '42703', '57014']) {
    expect(body).not.toContain(text);
  }
}

const errorFields = (e: { code: string; message: string; details: string; hint: string | null }) => [e.message, e.details, e.hint, e.code];

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
  requireAuthMock.mockResolvedValue('user-1');
  createClientMock.mockImplementation(fakeSupabase);
  vi.stubGlobal('fetch', vi.fn(routeFetch));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  planStep = ok(PLAN);
  itemsStep = ok(ROWS);
  recipesStep = async (ids) => ({ data: visibleRecipes(ids), error: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getMenuPlanDetail result', () => {
  it('reports a missing plan with no error, and a failed plan read with its error', async () => {
    planStep = fail(NOT_FOUND_ERROR);
    expect(await getMenuPlanDetail(fakeSupabase(), 'plan-1', 'user-1')).toEqual({ plan: null, items: null, recipes: null, error: null });

    planStep = fail(TIMEOUT_ERROR);
    expect(await getMenuPlanDetail(fakeSupabase(), 'plan-1', 'user-1')).toEqual({ plan: null, items: null, recipes: null, error: TIMEOUT_ERROR });
  });

  it('propagates a recipe query error instead of returning no recipes', async () => {
    recipesStep = async () => ({ data: null, error: COLUMN_ERROR });
    const result = await getMenuPlanDetail(fakeSupabase(), 'plan-1', 'user-1');
    expect(result.error).toBe(COLUMN_ERROR);
    expect(result.recipes).toBeNull();
  });

  it('treats an empty or partial successful recipe lookup as no error', async () => {
    recipesStep = async () => ({ data: [], error: null });
    expect(await getMenuPlanDetail(fakeSupabase(), 'plan-1', 'user-1')).toMatchObject({ error: null, recipes: [] });

    recipesStep = async () => ({ data: [RECIPES[RECIPE_A]], error: null });
    expect(await getMenuPlanDetail(fakeSupabase(), 'plan-1', 'user-1')).toMatchObject({ error: null, recipes: [RECIPES[RECIPE_A]] });
  });
});

describe('GET /api/user/menus/[id] error contract', () => {
  it('A. valid plan with every recipe → 200', async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.body.data!.items.map((i) => (i.recipe as { name: string }).name)).toEqual(['番茄炒蛋', '蒸豆腐', '番茄炒蛋']);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('B. recipe omitted by a successful query → 200, the item stays without a recipe', async () => {
    recipesStep = async () => ({ data: [RECIPES[RECIPE_A]], error: null });
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.body.data!.items).toHaveLength(3);
    expect(res.body.data!.items[1].recipe_id).toBe(RECIPE_B);
    expect(res.body.data!.items[1].recipe).toBeUndefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('C. successful empty recipe lookup → 200, every item stays as unavailable', async () => {
    recipesStep = async () => ({ data: [], error: null });
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.body.data!.items.map((i) => i.recipe)).toEqual([null, null, null]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each([
    ['D. recipe query data:null + 42703', COLUMN_ERROR],
    ['E. recipe query statement timeout 57014', TIMEOUT_ERROR],
    ['F. recipe query fetch/network failure', FETCH_ERROR],
  ])('%s → 500 generic', async (_label, error) => {
    recipesStep = async () => ({ data: null, error });
    expectGeneric500(await get(), errorFields(error));
  });

  it('recipe query with partial data and an error → 500 generic, not a partial plan', async () => {
    recipesStep = async () => ({ data: [RECIPES[RECIPE_A]], error: TIMEOUT_ERROR });
    expectGeneric500(await get(), errorFields(TIMEOUT_ERROR));
  });

  it('G. item query failure → 500 generic', async () => {
    itemsStep = fail(TIMEOUT_ERROR);
    expectGeneric500(await get(), errorFields(TIMEOUT_ERROR));
  });

  it.each([
    ['timeout', TIMEOUT_ERROR],
    ['network', FETCH_ERROR],
    ['schema', COLUMN_ERROR],
  ])('H. plan query %s failure → 500 generic, not 404', async (_label, error) => {
    planStep = fail(error);
    expectGeneric500(await get(), errorFields(error));
  });

  it('I. plan not found (PGRST116, including another user\'s plan under RLS) → 404', async () => {
    planStep = fail(NOT_FOUND_ERROR);
    const res = await get();
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Plan not found' });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('I. a planId that is not a uuid (22P02) → 404', async () => {
    planStep = fail({ code: '22P02', message: 'invalid input syntax for type uuid: "nope"', details: null, hint: null });
    const res = await get('nope');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Plan not found' });
  });

  it('J. a query that throws → 500 generic', async () => {
    itemsStep = async () => { throw new Error(THROWN_MESSAGE); };
    expectGeneric500(await get(), [THROWN_MESSAGE, 'db.internal']);
  });

  it('J. an exception before the plan read → 500 generic', async () => {
    createClientMock.mockImplementation(() => { throw new Error(`Invalid supabaseUrl: ${THROWN_MESSAGE}`); });
    expectGeneric500(await get(), [THROWN_MESSAGE, 'supabaseUrl', 'db.internal']);
  });
});

describe('usePlanDetailController', () => {
  it('K. recipe query error → controller error, no plan content', async () => {
    recipesStep = async () => ({ data: null, error: COLUMN_ERROR });
    const controller = await loadController();
    expect(controller.error).toBe('Failed to load plan');
    expect(controller.plan).toBeNull();
    expect(controller.items).toEqual([]);
    expect(controller.mealSlotGroupsByDay).toEqual({});
    expect(controller.recipeIds).toEqual([]);
  });

  it('L. RLS omission → no error, the item stays unavailable in its slot, recipeIds keep every occurrence', async () => {
    recipesStep = async () => ({ data: [RECIPES[RECIPE_A]], error: null });
    const controller = await loadController();
    expect(controller.error).toBeNull();
    expect(controller.items.map((i) => i.recipe?.name ?? null)).toEqual(['番茄炒蛋', null, '番茄炒蛋']);
    expect('recipe' in controller.items[1]).toBe(false);
    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_B, RECIPE_A]);
    expect(controller.mealSlotGroupsByDay[0].map((g) => g.mealSlot)).toEqual(['breakfast', 'dinner']);
    expect(controller.mealSlotGroupsByDay[1].map((g) => g.mealSlot)).toEqual(['snack']);
  });
});

describe('server-side logging', () => {
  it.each([
    ['plan', () => { planStep = fail(TIMEOUT_ERROR); }, TIMEOUT_ERROR.message],
    ['items', () => { itemsStep = fail(TIMEOUT_ERROR); }, TIMEOUT_ERROR.message],
    ['recipes', () => { recipesStep = async () => ({ data: null, error: COLUMN_ERROR }); }, COLUMN_ERROR.message],
    ['thrown', () => { itemsStep = async () => { throw new Error(THROWN_MESSAGE); }; }, THROWN_MESSAGE],
  ])('M/N. %s failure is logged with the planId and error, without token or key material', async (_label, arrange, message) => {
    arrange();
    await get();
    expect(consoleError).toHaveBeenCalledTimes(1);
    const logged = inspect(consoleError.mock.calls[0], { depth: 10 });
    expect(logged).toContain('plan-1');
    expect(logged).toContain(message);
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(ANON_KEY);
    expect(logged).not.toMatch(/authorization|bearer/i);
  });
});
