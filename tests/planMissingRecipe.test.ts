// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { NextApiRequest, NextApiResponse } from 'next';

// A saved plan item can outlive its recipe lookup. /api/user/menus/[id] reads
// recipes with the user's client, so RLS returns only public recipes: a recipe
// made private after the plan was saved is simply omitted. The item must still
// reach the page (rendered as unavailable by PlanRecipeCard), keep its meal
// slot, and keep counting toward the shopping list.
//
// Real path: /api/user/menus/[id] → getPlanDetail → usePlanDetailController.
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
import { usePlanDetailController } from '../src/features/plans';

const RECIPE_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const RECIPE_B = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const VISIBLE_RECIPES = [
  { id: RECIPE_A, name: '番茄炒蛋', image_url: null, total_time_minutes: 10, difficulty: 'easy', method: 'stir_fry' },
];

type Row = { date: string; meal_slot: string; recipe_id: string };
let rows: Row[] = [];
let visibleRecipes = VISIBLE_RECIPES;

function fakeSupabase() {
  return {
    from: (table: string) => {
      if (table === 'menu_plans') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ eq: () => ({
          single: async () => ({ data: { id, user_id: 'user-1', title: 'Saved', start_date: '2026-10-05', end_date: '2026-10-11', created_at: '2026-10-01' }, error: null }),
        }) }) }) };
      }
      if (table === 'menu_plan_items') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ order: () => ({ order: async () => ({
          data: rows.map((row, index) => ({ id: `${id}-item-${index}`, menu_plan_id: id, servings: 2, item_order: 1, source: 'generated', ...row })),
          error: null,
        }) }) }) }) };
      }
      if (table === 'recipes') {
        // RLS: only the visible (public) recipes come back.
        return { select: () => ({ in: async (_c: string, ids: string[]) => ({ data: visibleRecipes.filter((r) => ids.includes(r.id)), error: null }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

async function routeFetch(url: string) {
  const match = url.match(/^\/api\/user\/menus\/([^/?]+)$/);
  if (!match) throw new Error(`Unexpected fetch: ${url}`);
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    // Serialise like a real response: undefined-valued keys are dropped.
    json(body: unknown) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  };
  await (menuDetailHandler as never as (req: NextApiRequest, res: NextApiResponse) => Promise<void>)(
    { method: 'GET', query: { id: match[1] }, headers: { authorization: 'Bearer token' } } as unknown as NextApiRequest,
    res as unknown as NextApiResponse,
  );
  return { ok: res.statusCode < 400, status: res.statusCode, json: async () => res.body };
}

async function loadController(planRows: Row[]) {
  rows = planRows;
  const { result } = renderHook(() => usePlanDetailController({
    planId: 'plan-1', isAuthenticated: true, userId: 'user-1', getAccessToken: async () => 'token',
  }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBeNull();
  return result.current;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  requireAuthMock.mockResolvedValue('user-1');
  createClientMock.mockImplementation(fakeSupabase);
  vi.stubGlobal('fetch', vi.fn(routeFetch));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  visibleRecipes = VISIBLE_RECIPES;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usePlanDetailController with a partial recipe lookup', () => {
  it('J. keeps the item without a recipe, its meal slot, and every recipe id occurrence', async () => {
    const controller = await loadController([
      { date: '2026-10-05', meal_slot: 'dinner', recipe_id: RECIPE_A },
      { date: '2026-10-05', meal_slot: 'snack', recipe_id: RECIPE_B },
      { date: '2026-10-06', meal_slot: 'dinner', recipe_id: RECIPE_A },
    ]);

    expect(controller.items).toHaveLength(3);
    expect(controller.items.map((i) => i.recipe?.name ?? null)).toEqual(['番茄炒蛋', null, '番茄炒蛋']);
    // The omitted recipe arrives with no recipe key at all.
    expect('recipe' in controller.items[1]).toBe(false);
    expect(controller.items[1].recipe_id).toBe(RECIPE_B);
    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_B, RECIPE_A]);
    expect(controller.mealSlotGroupsByDay[0].map((g) => [g.mealSlot, g.items.map((i: { recipe_id: string }) => i.recipe_id)])).toEqual([
      ['dinner', [RECIPE_A]],
      ['snack', [RECIPE_B]],
    ]);
  });

  it('keeps every item when no recipe comes back at all', async () => {
    visibleRecipes = [];
    const controller = await loadController([
      { date: '2026-10-05', meal_slot: 'breakfast', recipe_id: RECIPE_A },
      { date: '2026-10-05', meal_slot: 'dinner', recipe_id: RECIPE_B },
    ]);

    expect(controller.items.map((i) => [i.mealSlot, i.recipe])).toEqual([['breakfast', null], ['dinner', null]]);
    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_B]);
  });
});
