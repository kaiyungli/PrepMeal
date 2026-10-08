// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { NextApiRequest, NextApiResponse } from 'next';

// Generate → Save → Database → Plan Detail, with empty slots.
//   save: planWeekAdvanced → getVisiblePlan → normalizePlanForSave
//         → POST /api/user/menus → create_menu_plan_atomic
//   read: GET /api/user/menus/[id] → getPlanDetail → usePlanDetailController
// Only Supabase is faked. The fake RPC mirrors
// supabase/migrations/20260909050201_atomic_saved_plan_write.sql: the same
// validation (uuid, meal type, day_index < days_count) and item_order computed
// as row_number() per (day, meal type) in input order. The RPC takes no slot
// index, dish role or lock flag, so none can be stored.

const { requireAuthMock, createClientMock } = vi.hoisted(() => {
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
import { getVisiblePlan } from '../src/features/generate/utils/visiblePlan';
import { planWeekAdvanced } from '../src/lib/mealPlanner';
import { COMPOSITION_CONFIG } from '../src/constants/composition';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const recipe = (n: number, meal_role: string, dish_type: string, primary_protein?: string) => ({
  id: uuid(n), name: `r${n}`, meal_role, dish_type, primary_protein,
  is_complete_meal: meal_role === 'complete_meal', method: `m${n}`, image_url: null,
  total_time_minutes: 10, calories_per_serving: null, difficulty: 'easy',
});
const MAIN_1 = recipe(1, 'protein_main', 'main', 'pork');
const MAIN_2 = recipe(2, 'protein_main', 'main', 'beef');
const MAIN_3 = recipe(3, 'protein_main', 'main', 'fish');
const VEG_1 = recipe(11, 'veg_side', 'side');
const VEG_2 = recipe(12, 'veg_side', 'side');
const COMPLETE_1 = recipe(21, 'complete_meal', 'main', 'chicken');
const COMPLETE_2 = recipe(22, 'complete_meal', 'main', 'beef');
const ALL = [MAIN_1, MAIN_2, MAIN_3, VEG_1, VEG_2, COMPLETE_1, COMPLETE_2];
const PUBLIC_IDS = new Set(ALL.map((r) => r.id));

type Row = { id: string; date: string; meal_slot: string; recipe_id: string; servings: number; item_order: number };
type SaveItem = { day_index: number; meal_type: string; recipe_id: string; servings: number; [extra: string]: unknown };
let plans: Record<string, { start_date: string; end_date: string; rows: Row[] }> = {};
let rpcCalls: Array<{ p_items: SaveItem[] }> = [];

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function createMenuPlanAtomic(args: { p_week_start_date: string; p_days_count: number; p_items: SaveItem[] }) {
  rpcCalls.push(args);
  const invalid = args.p_items.length < 1 || args.p_items.some((item) =>
    !Number.isInteger(item.day_index) || item.day_index < 0 || item.day_index >= args.p_days_count
    || !['breakfast', 'lunch', 'dinner', 'snack'].includes(item.meal_type)
    || !PUBLIC_IDS.has(item.recipe_id) || !(item.servings > 0));
  if (invalid) return { data: null, error: { code: '22023', message: 'Each item requires a valid day, meal type, recipe id, and servings' } };

  const id = uuid(900 + Object.keys(plans).length);
  const counters: Record<string, number> = {};
  const rows = args.p_items.map((item, index) => {
    const key = `${item.day_index}|${item.meal_type}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return { id: `${id}-${index}`, date: addDays(args.p_week_start_date, item.day_index), meal_slot: item.meal_type,
      recipe_id: item.recipe_id, servings: item.servings, item_order: counters[key] };
  });
  plans[id] = { start_date: args.p_week_start_date, end_date: addDays(args.p_week_start_date, args.p_days_count - 1), rows };
  return { data: id, error: null };
}

function fakeSupabase() {
  return {
    rpc: async (name: string, args: Parameters<typeof createMenuPlanAtomic>[0]) => {
      if (name !== 'create_menu_plan_atomic') throw new Error(`Unexpected rpc: ${name}`);
      return createMenuPlanAtomic(args);
    },
    from: (table: string) => {
      if (table === 'menu_plans') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ eq: () => ({
          single: async () => (plans[id]
            ? { data: { id, user_id: 'user-1', title: 'Saved', start_date: plans[id].start_date, end_date: plans[id].end_date, created_at: '2026-10-01' }, error: null }
            : { data: null, error: { code: 'PGRST116', message: 'not found' } }),
        }) }) }) };
      }
      if (table === 'menu_plan_items') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ order: () => ({ order: async () => ({
          data: [...plans[id].rows]
            .sort((a, b) => a.date.localeCompare(b.date) || a.item_order - b.item_order)
            .map((row) => ({ ...row, menu_plan_id: id, source: 'generated' })),
          error: null,
        }) }) }) }) };
      }
      if (table === 'recipes') {
        return { select: () => ({ in: async (_c: string, ids: string[]) => ({ data: ALL.filter((r) => ids.includes(r.id)), error: null }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

async function callHandler(handler: (req: NextApiRequest, res: NextApiResponse) => unknown, req: Partial<NextApiRequest>) {
  const res = {
    statusCode: 200, body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  await handler({ headers: { authorization: 'Bearer token' }, ...req } as NextApiRequest, res as unknown as NextApiResponse);
  return { ok: res.statusCode < 400, status: res.statusCode, body: res.body as { data: Record<string, unknown> } };
}

type Plan = Record<string, Array<{ id: string } | null>>;

async function saveFromGrid(plan: Plan, daysPerWeek: number, dishesPerDay: number, servings = 2) {
  const payload = normalizePlanForSave(getVisiblePlan(plan, daysPerWeek, dishesPerDay), servings, daysPerWeek);
  const { status, body } = await callHandler(menusHandler as never, { method: 'POST', body: payload });
  return { status, planId: body?.data?.plan_id as string | undefined, payload };
}

async function reload(planId: string) {
  const { result } = renderHook(() => usePlanDetailController({
    planId, isAuthenticated: true, userId: 'user-1', getAccessToken: async () => 'token',
  }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBeNull();
  return result.current;
}

// Day index → recipe ids in displayed order, as Plan Detail shows them.
const daysOf = (c: Awaited<ReturnType<typeof reload>>) => Object.fromEntries(
  Object.entries(c.mealSlotGroupsByDay).map(([day, groups]) => [
    day, groups.flatMap((g) => g.items.map((i: { recipe_id: string }) => i.recipe_id)),
  ]),
);

// What survives a round trip: the grid's recipes per day in slot order, empty slots dropped.
const expectedDays = (plan: Plan, daysPerWeek: number, dishesPerDay: number) => Object.fromEntries(
  Object.entries(getVisiblePlan(plan, daysPerWeek, dishesPerDay))
    .map(([day, slots]) => [['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day), slots.filter(Boolean).map((r) => r!.id)])
    .filter(([, ids]) => (ids as string[]).length > 0)
    .map(([day, ids]) => [String(day), ids]),
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
  rpcCalls = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('save → reload with empty slots (meat_veg, two_meat_one_veg)', () => {
  it.each([
    ['all slots filled', { mon: [MAIN_1, VEG_1], tue: [MAIN_2, VEG_2] }, 2, 2],
    ['first slot empty', { mon: [null, VEG_1], tue: [MAIN_2, VEG_2] }, 2, 2],
    ['last slot empty', { mon: [MAIN_1, null], tue: [MAIN_2, VEG_2] }, 2, 2],
    ['middle slot empty (two meat + one veg)', { mon: [MAIN_1, null, VEG_1], tue: [MAIN_2, MAIN_3, VEG_2] }, 2, 3],
    ['multiple empty slots, one whole day empty', { mon: [null, VEG_1, null], tue: [null, null, null], wed: [MAIN_3, null, VEG_2] }, 3, 3],
  ] as Array<[string, Plan, number, number]>)('%s: each day keeps its recipes in slot order; no slot is invented', async (_label, plan, days, dishes) => {
    const { status, planId, payload } = await saveFromGrid(plan, days, dishes);
    expect(status).toBe(201);
    // Only real recipes are sent, in slot order, each with only the RPC's fields.
    expect(payload.items.every((i) => Object.keys(i).sort().join() === 'day_index,meal_type,recipe_id,servings')).toBe(true);

    const reloaded = await reload(planId!);
    expect(daysOf(reloaded)).toEqual(expectedDays(plan, days, dishes));
    expect(reloaded.items.map((i) => i.recipe?.id)).toEqual(reloaded.items.map((i) => i.recipe_id));
    // Detail exposes order only (item_order 1..n per day), never a slot role.
    expect(reloaded.items.some((i) => 'dish_role' in i || 'slot_index' in i)).toBe(false);
  });

  it('an empty first slot is not stored as an empty position: the veg side reloads as the day\'s first item', async () => {
    const { planId } = await saveFromGrid({ mon: [null, VEG_1] }, 1, 2);
    const reloaded = await reload(planId!);
    expect(reloaded.items.map((i) => [i.recipe_id, i.item_order])).toEqual([[VEG_1.id, 1]]);
  });

  it('a plan with every slot empty produces no items, which the database rejects (handleSave stops first)', async () => {
    const payload = normalizePlanForSave(getVisiblePlan({ mon: [null, null], tue: [null, null] }, 2, 2), 2, 2);
    expect(payload.items).toEqual([]);
    const { status } = await callHandler(menusHandler as never, { method: 'POST', body: payload });
    expect(status).toBe(400);
    expect(Object.keys(plans)).toEqual([]);
  });

  it('keeps a recipe repeated within a week as separate saved meals', async () => {
    const plan = { mon: [MAIN_1, VEG_1], tue: [MAIN_1, VEG_1] };
    const reloaded = await reload((await saveFromGrid(plan, 2, 2)).planId!);
    expect(daysOf(reloaded)).toEqual({ 0: [MAIN_1.id, VEG_1.id], 1: [MAIN_1.id, VEG_1.id] });
    expect(reloaded.recipeIds).toEqual([MAIN_1.id, VEG_1.id, MAIN_1.id, VEG_1.id]);
  });
});

describe('save → reload from the real planner per composition mode', () => {
  it.each(Object.keys(COMPOSITION_CONFIG))('%s: a generated plan with empty slots round-trips its recipes', async (mode) => {
    const config = COMPOSITION_CONFIG[mode as keyof typeof COMPOSITION_CONFIG];
    const plan = planWeekAdvanced(ALL, {
      daysPerWeek: 3, dishesPerDay: config.dishesPerDay, slotRoles: config.slotRoles,
      dailyComposition: mode, isWeekend: () => false,
    }) as Plan;
    // Small pool: some slots must be empty, and every filled one fits its role.
    expect(Object.values(plan).flat().some((r) => r === null)).toBe(true);

    const { status, planId } = await saveFromGrid(plan, 3, config.dishesPerDay);
    expect(status).toBe(201);
    expect(daysOf(await reload(planId!))).toEqual(expectedDays(plan, 3, config.dishesPerDay));
  });

  it('a locked recipe saves in its day like any other; the lock itself is not stored', async () => {
    const config = COMPOSITION_CONFIG.complete_meal;
    const plan = planWeekAdvanced(ALL, {
      daysPerWeek: 2, dishesPerDay: 1, slotRoles: config.slotRoles, dailyComposition: 'complete_meal',
      isWeekend: () => false, lockedSlots: { 'tue-0': true }, lockedRecipes: { 'tue-0': COMPLETE_2 },
    }) as Plan;
    expect(plan.tue[0]?.id).toBe(COMPLETE_2.id);

    const { planId, payload } = await saveFromGrid(plan, 2, 1);
    expect(payload.items.some((i) => 'is_locked' in i)).toBe(false);
    expect(daysOf(await reload(planId!))).toEqual({ 0: [COMPLETE_1.id], 1: [COMPLETE_2.id] });
  });
});

describe('save uses only what the grid shows', () => {
  it('days removed after generating are neither saved nor allowed to fail the save', async () => {
    // Generated for 3 days, then the user switched to 2 days without regenerating.
    const plan = { mon: [MAIN_1, VEG_1], tue: [MAIN_2, VEG_2], wed: [MAIN_3, null] };

    const unfiltered = normalizePlanForSave(plan, 2, 2);
    const rejected = await callHandler(menusHandler as never, { method: 'POST', body: unfiltered });
    expect(rejected.status).toBe(400); // day_index 2 >= days_count 2: what the old save path sent

    const { status, planId } = await saveFromGrid(plan, 2, 2);
    expect(status).toBe(201);
    expect(daysOf(await reload(planId!))).toEqual({ 0: [MAIN_1.id, VEG_1.id], 1: [MAIN_2.id, VEG_2.id] });
  });

  it('slots hidden after switching to a smaller composition are not saved', async () => {
    // Generated as two_meat_one_veg, then switched to complete_meal (1 visible slot).
    const plan = { mon: [MAIN_1, MAIN_2, VEG_1] };
    const { planId } = await saveFromGrid(plan, 1, 1);
    expect(daysOf(await reload(planId!))).toEqual({ 0: [MAIN_1.id] });
  });
});
