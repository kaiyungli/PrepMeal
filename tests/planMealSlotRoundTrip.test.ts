// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { NextApiRequest, NextApiResponse } from 'next';

// Round trip of a meal slot through the real code path:
//   save: normalizePlanForSave → POST /api/user/menus → create_menu_plan_atomic
//   read: GET /api/user/menus/[id] → getPlanDetail → usePlanDetailController
// Only Supabase is faked. The fake RPC stores rows the way the migration does
// (meal_slot = meal_type, item_order restarting per day and slot).

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

import menusHandler from '../src/pages/api/user/menus/index.js';
import menuDetailHandler from '../src/pages/api/user/menus/[id].js';
import { usePlanDetailController } from '../src/features/plans';
import { normalizePlanForSave } from '../src/features/generate/mappers/normalizePlanForSave';

const RECIPE_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const RECIPE_B = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const RECIPES = [
  { id: RECIPE_A, name: '番茄炒蛋', image_url: null, total_time_minutes: 10, difficulty: 'easy', method: 'stir_fry' },
  { id: RECIPE_B, name: '蒸豆腐', image_url: null, total_time_minutes: 15, difficulty: 'easy', method: 'steam' },
];

type Row = { id: string; date: string; meal_slot: string; recipe_id: string; servings: number; item_order: number };
type Plan = { start_date: string; end_date: string; rows: Row[] };
type SaveItem = { day_index: number; meal_type: string; recipe_id: string; servings: number };

let plans: Record<string, Plan> = {};

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function createMenuPlanAtomic(args: { p_week_start_date: string; p_days_count: number; p_items: SaveItem[] }) {
  const id = `00000000-0000-4000-8000-${String(Object.keys(plans).length + 1).padStart(12, '0')}`;
  const counters: Record<string, number> = {};
  const rows = args.p_items.map((item, index) => {
    const key = `${item.day_index}|${item.meal_type}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return {
      id: `${id}-item-${index}`,
      date: addDays(args.p_week_start_date, item.day_index),
      meal_slot: item.meal_type,
      recipe_id: item.recipe_id,
      servings: item.servings,
      item_order: counters[key],
    };
  });
  plans[id] = { start_date: args.p_week_start_date, end_date: addDays(args.p_week_start_date, args.p_days_count - 1), rows };
  return id;
}

function fakeSupabase() {
  return {
    rpc: async (name: string, args: Parameters<typeof createMenuPlanAtomic>[0]) => {
      if (name !== 'create_menu_plan_atomic') throw new Error(`Unexpected rpc: ${name}`);
      return { data: createMenuPlanAtomic(args), error: null };
    },
    from: (table: string) => {
      if (table === 'menu_plans') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ eq: () => ({
          single: async () => (plans[id]
            ? { data: { id, user_id: 'user-1', title: 'Saved', start_date: plans[id].start_date, end_date: plans[id].end_date, created_at: '2026-10-01' }, error: null }
            : { data: null, error: { message: 'not found' } }),
        }) }) }) };
      }
      if (table === 'menu_plan_items') {
        // Same ordering the real query asks for: date, then item_order.
        return { select: () => ({ eq: (_c: string, id: string) => ({ order: () => ({ order: async () => ({
          data: [...plans[id].rows]
            .sort((a, b) => a.date.localeCompare(b.date) || a.item_order - b.item_order)
            .map((row) => ({ ...row, menu_plan_id: id, source: 'generated' })),
          error: null,
        }) }) }) }) };
      }
      if (table === 'recipes') {
        return { select: () => ({ in: async (_c: string, ids: string[]) => ({ data: RECIPES.filter((r) => ids.includes(r.id)), error: null }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

async function callHandler(handler: (req: NextApiRequest, res: NextApiResponse) => unknown, req: Partial<NextApiRequest>) {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  await handler({ headers: { authorization: 'Bearer token' }, ...req } as NextApiRequest, res as unknown as NextApiResponse);
  return { ok: res.statusCode < 400, status: res.statusCode, body: res.body as { data: Record<string, unknown> } };
}

async function save(payload: { name: string; week_start_date: string; days_count: number; items: SaveItem[] }) {
  const { status, body } = await callHandler(menusHandler as never, { method: 'POST', body: payload });
  expect(status).toBe(201);
  return body.data.plan_id as string;
}

async function reload(planId: string) {
  const { result } = renderHook(() => usePlanDetailController({
    planId, isAuthenticated: true, userId: 'user-1', getAccessToken: async () => 'token',
  }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBeNull();
  return result.current;
}

const slotsByDay = (controller: Awaited<ReturnType<typeof reload>>) => Object.fromEntries(
  Object.entries(controller.mealSlotGroupsByDay).map(([day, groups]) => [
    day, groups.map((g) => [g.mealSlot, g.label, g.items.map((i: { recipe_id: string }) => i.recipe_id)]),
  ]),
);

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  requireAuthMock.mockResolvedValue('user-1');
  createClientMock.mockImplementation(fakeSupabase);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const match = url.match(/^\/api\/user\/menus\/([^/?]+)$/);
    if (!match) throw new Error(`Unexpected fetch: ${url}`);
    const { ok, status, body } = await callHandler(menuDetailHandler as never, { method: 'GET', query: { id: match[1] } });
    return { ok, status, json: async () => body };
  }));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  plans = {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('saved meal_type → reload → mealSlot', () => {
  it('each saved meal_type comes back as the same mealSlot', async () => { // M
    const planId = await save({
      name: 'Mixed', week_start_date: '2026-10-05', days_count: 2,
      items: [
        { day_index: 0, meal_type: 'snack', recipe_id: RECIPE_B, servings: 2 },
        { day_index: 0, meal_type: 'breakfast', recipe_id: RECIPE_A, servings: 2 },
        { day_index: 0, meal_type: 'dinner', recipe_id: RECIPE_B, servings: 2 },
        { day_index: 0, meal_type: 'lunch', recipe_id: RECIPE_A, servings: 2 },
        { day_index: 0, meal_type: 'breakfast', recipe_id: RECIPE_B, servings: 2 },
        { day_index: 1, meal_type: 'lunch', recipe_id: RECIPE_B, servings: 2 },
      ],
    });

    const controller = await reload(planId);

    // The API exposes the slot only as meal_type; reading meal_slot (as
    // PlanDaySection used to) found nothing and put every meal under dinner.
    expect(controller.items.some((i) => 'meal_slot' in i)).toBe(false);
    expect(controller.items.map((i) => [i.meal_type, i.mealSlot])).toEqual(
      controller.items.map((i) => [i.meal_type, i.meal_type]),
    );
    expect(slotsByDay(controller)).toEqual({
      0: [
        ['breakfast', '早餐', [RECIPE_A, RECIPE_B]],
        ['lunch', '午餐', [RECIPE_A]],
        ['dinner', '晚餐', [RECIPE_B]],
        ['snack', '小食', [RECIPE_B]],
      ],
      1: [['lunch', '午餐', [RECIPE_B]]],
    });
    // Shopping list still gets one id per saved meal, duplicates included.
    expect([...controller.recipeIds].sort()).toEqual([RECIPE_A, RECIPE_A, RECIPE_B, RECIPE_B, RECIPE_B, RECIPE_B].sort());
  });

  it('a Generate dinner save reloads as dinner', async () => { // N
    const payload = normalizePlanForSave({
      mon: [{ id: RECIPE_A }, { id: RECIPE_B }],
      tue: [{ id: RECIPE_A }],
      wed: [],
    }, 3, 3);
    expect(payload.items.every((i) => i.meal_type === 'dinner')).toBe(true);

    const controller = await reload(await save(payload));

    expect(controller.items.map((i) => i.mealSlot)).toEqual(['dinner', 'dinner', 'dinner']);
    expect(slotsByDay(controller)).toEqual({
      0: [['dinner', '晚餐', [RECIPE_A, RECIPE_B]]],
      1: [['dinner', '晚餐', [RECIPE_A]]],
    });
    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_B, RECIPE_A]);
    expect(controller.avgServings).toBe(3);
  });
});
