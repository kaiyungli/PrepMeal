// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { ShoppingListResponse } from '@/features/shopping-list/types';

// A saved plan stores one menu_plan_items row per planned meal, so the same
// recipe can appear on several days or in several meal slots. Every one of
// those rows must reach /api/shopping-list, which counts occurrences.
//
// The proof is split along the real path:
//   1. usePlanDetailController loads a plan through the real getPlanDetail and
//      the real /api/user/menus/[id] handler, and must return every occurrence.
//   2. Its recipeIds/avgServings, posted exactly as ShoppingListSection posts
//      them, go through the real /api/shopping-list handler.
//   3. /my-plans/[id] and ShoppingListSection are .js files with JSX, which
//      this Vitest setup does not compile, so their pass-through from the
//      controller to the request body is pinned at source level.

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
import shoppingListHandler from '../src/pages/api/shopping-list';
import { usePlanDetailController } from '../src/features/plans';

const RECIPE_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const RECIPE_B = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const RECIPES = [
  { id: RECIPE_A, name: '番茄炒蛋', image_url: null, total_time_minutes: 10, difficulty: 'easy', method: 'stir_fry' },
  { id: RECIPE_B, name: '蒸豆腐', image_url: null, total_time_minutes: 15, difficulty: 'easy', method: 'steam' },
];
// Recipe A: 2 eggs + 1 tomato. Recipe B: 3 eggs + 1 tofu.
const INGREDIENT_ROWS = ([
  [RECIPE_A, 'egg', '雞蛋', 2, 'egg'],
  [RECIPE_A, 'tomato', '番茄', 1, 'vegetable'],
  [RECIPE_B, 'egg', '雞蛋', 3, 'egg'],
  [RECIPE_B, 'tofu', '豆腐', 1, 'tofu'],
] as Array<[string, string, string, number, string]>).map(([recipeId, ingredientId, name, quantity, category]) => ({
  quantity,
  recipe_id: recipeId,
  ingredient_id: ingredientId,
  ingredients: { id: ingredientId, name, shopping_category: category },
  recipes: { id: recipeId, name: RECIPES.find((r) => r.id === recipeId)!.name },
  units: { id: 'pc', code: 'pc', display_name_en: 'pc', display_name_zh: '隻' },
}));

type PlanRow = { date: string; meal_slot: string; recipe_id: string | null; servings: number; item_order?: number };

let plans: Record<string, PlanRow[]> = {};

// menu_plans, menu_plan_items and recipes for the menus API; recipes,
// recipe_ingredients and user_preferences for the shopping-list API.
function fakeSupabase() {
  return {
    from: (table: string) => {
      if (table === 'menu_plans') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ eq: () => ({
          single: async () => (plans[id]
            ? { data: { id, user_id: 'user-1', title: 'Saved', start_date: '2026-10-05', end_date: '2026-10-11', created_at: '2026-10-01' }, error: null }
            : { data: null, error: { message: 'not found' } }),
        }) }) }) };
      }
      if (table === 'menu_plan_items') {
        return { select: () => ({ eq: (_c: string, id: string) => ({ order: () => ({ order: async () => ({
          data: (plans[id] ?? []).map((row, index) => ({
            id: `${id}-item-${index}`, menu_plan_id: id, item_order: 1, source: 'generated', ...row,
          })),
          error: null,
        }) }) }) }) };
      }
      if (table === 'recipes') {
        return { select: () => ({ in: (_c: string, ids: string[]) => {
          const rows = RECIPES.filter((r) => ids.includes(r.id));
          // The menus API awaits .in() directly; the shopping-list API adds .eq('is_public').
          return Object.assign(Promise.resolve({ data: rows, error: null }), {
            eq: async () => ({ data: rows.map(({ id }) => ({ id })), error: null }),
          });
        } }) };
      }
      if (table === 'recipe_ingredients') {
        return { select: () => ({ in: async (_c: string, ids: string[]) => ({
          data: INGREDIENT_ROWS.filter((r) => ids.includes(r.recipe_id)), error: null,
        }) }) };
      }
      if (table === 'user_preferences') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { unit_language: 'zh' } }) }) }) };
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
  return { ok: res.statusCode < 400, status: res.statusCode, body: res.body };
}

// getPlanDetail fetches /api/user/menus/:id; route it to the real handler.
async function routeFetch(url: string) {
  const menuMatch = url.match(/^\/api\/user\/menus\/([^/?]+)$/);
  if (!menuMatch) throw new Error(`Unexpected fetch: ${url}`);
  const { ok, status, body } = await callHandler(menuDetailHandler as never, { method: 'GET', query: { id: menuMatch[1] } });
  return { ok, status, json: async () => body };
}

async function loadController(rows: PlanRow[], planId = '5d2f6a0e-8c1b-4e7a-9f3d-2b6c8e1a4f70') {
  plans[planId] = rows;
  const { result } = renderHook(() => usePlanDetailController({
    planId, isAuthenticated: true, userId: 'user-1', getAccessToken: async () => 'token',
  }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBeNull();
  return result.current;
}

// The body ShoppingListSection posts: { recipeIds, servings } from the
// controller (see the source-level pass-through test below).
async function requestShoppingList(controller: { recipeIds: string[]; avgServings: number }) {
  const { status, body } = await callHandler(shoppingListHandler as never, {
    method: 'POST',
    body: { recipeIds: controller.recipeIds, servings: controller.avgServings },
  });
  expect(status).toBe(200);
  return body as ShoppingListResponse;
}

function toBuy(body: ShoppingListResponse): Record<string, number> {
  return Object.fromEntries(body.toBuy.flatMap((section) => section.items).map((item) => [item.name, item.quantity as number]));
}

const meal = (date: string, recipeId: string | null, servings = 1, mealSlot = 'dinner'): PlanRow => ({
  date, meal_slot: mealSlot, recipe_id: recipeId, servings,
});

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-secret';
  requireAuthMock.mockResolvedValue('user-1');
  createClientMock.mockImplementation(fakeSupabase);
  vi.stubGlobal('fetch', vi.fn(routeFetch));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  plans = {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usePlanDetailController saved-plan occurrences', () => {
  it('returns a single saved recipe once', async () => {
    const controller = await loadController([meal('2026-10-05', RECIPE_A)]);

    expect(controller.recipeIds).toEqual([RECIPE_A]);
  });

  it('returns a recipe saved on two days twice', async () => {
    const controller = await loadController([meal('2026-10-05', RECIPE_A), meal('2026-10-06', RECIPE_A)]);

    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
  });

  it('preserves every occurrence of [A, B, A] in plan order', async () => {
    const controller = await loadController([meal('2026-10-05', RECIPE_A), meal('2026-10-06', RECIPE_B), meal('2026-10-07', RECIPE_A)]);

    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_B, RECIPE_A]);
  });

  it('counts the same recipe in different meal slots of one day separately', async () => {
    const controller = await loadController([meal('2026-10-05', RECIPE_A, 1, 'lunch'), meal('2026-10-05', RECIPE_A, 1, 'dinner')]);

    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
  });

  it('counts the same recipe twice in one slot (different item_order) separately', async () => {
    const controller = await loadController([
      { ...meal('2026-10-05', RECIPE_A), item_order: 1 },
      { ...meal('2026-10-05', RECIPE_A), item_order: 2 },
    ]);

    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
  });

  it('drops items without a recipe but keeps every other occurrence', async () => {
    const controller = await loadController([
      meal('2026-10-05', RECIPE_A),
      meal('2026-10-05', null, 1, 'lunch'),
      meal('2026-10-06', RECIPE_A),
    ]);

    expect(controller.items).toHaveLength(3);
    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
  });

  it('returns no recipe ids for a plan with no usable items', async () => {
    const controller = await loadController([meal('2026-10-05', null, 2)]);

    expect(controller.recipeIds).toEqual([]);
    expect(controller.avgServings).toBe(2);
  });

  it('keeps day grouping, plan order and saved servings unchanged', async () => {
    const controller = await loadController([
      meal('2026-10-05', RECIPE_A, 3), meal('2026-10-06', RECIPE_B, 3), meal('2026-10-06', RECIPE_A, 3, 'lunch'),
    ]);

    expect(Object.fromEntries(Object.entries(controller.groupedItems).map(([day, items]) => [day, items.map((i) => i.recipe_id)])))
      .toEqual({ 0: [RECIPE_A], 1: [RECIPE_B, RECIPE_A] });
    expect(controller.items.map((i) => i.recipe?.name)).toEqual(['番茄炒蛋', '蒸豆腐', '番茄炒蛋']);
    expect(controller.avgServings).toBe(3);
  });
});

describe('saved plan → /api/shopping-list', () => {
  it('keeps single-occurrence quantities unchanged', async () => {
    const body = await requestShoppingList(await loadController([meal('2026-10-05', RECIPE_A)]));

    expect(toBuy(body)).toEqual({ 雞蛋: 2, 番茄: 1 });
  });

  it('doubles the ingredients of a recipe saved on two days', async () => {
    const body = await requestShoppingList(await loadController([meal('2026-10-05', RECIPE_A), meal('2026-10-06', RECIPE_A)]));

    expect(toBuy(body)).toEqual({ 雞蛋: 4, 番茄: 2 });
  });

  it('weights each recipe of [A, B, A] by its occurrences', async () => {
    const body = await requestShoppingList(await loadController([
      meal('2026-10-05', RECIPE_A), meal('2026-10-06', RECIPE_B), meal('2026-10-07', RECIPE_A),
    ]));

    // eggs: A 2 x 2 + B 3 x 1
    expect(toBuy(body)).toEqual({ 雞蛋: 7, 番茄: 2, 豆腐: 1 });
  });

  it('composes the saved servings with occurrences', async () => {
    const body = await requestShoppingList(await loadController([
      meal('2026-10-05', RECIPE_A, 3), meal('2026-10-06', RECIPE_A, 3), meal('2026-10-07', RECIPE_B, 3),
    ]));

    // eggs: (2 x 2 + 3 x 1) x 3
    expect(toBuy(body)).toEqual({ 雞蛋: 21, 番茄: 6, 豆腐: 3 });
    expect(body.byRecipe.map((group) => [group.recipeName, group.toBuy.map((item) => item.quantity)])).toEqual([
      ['番茄炒蛋', [12, 6]],
      ['蒸豆腐', [9, 3]],
    ]);
  });

  it('gives saved plans [A] and [A, A] different lists', async () => {
    const single = await requestShoppingList(await loadController([meal('2026-10-05', RECIPE_A)], '00000000-0000-4000-8000-000000000001'));
    cleanup();
    const double = await requestShoppingList(await loadController(
      [meal('2026-10-05', RECIPE_A), meal('2026-10-06', RECIPE_A)], '00000000-0000-4000-8000-000000000002',
    ));

    expect(toBuy(single)).toEqual({ 雞蛋: 2, 番茄: 1 });
    expect(toBuy(double)).toEqual({ 雞蛋: 4, 番茄: 2 });
  });
});

describe('/my-plans/[id] → ShoppingListSection request pass-through', () => {
  const source = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const page = source('src/pages/my-plans/[id].js');
  const section = source('src/components/myPlans/ShoppingListSection.js');
  const request = source('src/features/plans/hooks/useSavedPlanShoppingList.ts');

  it('passes the controller recipeIds and avgServings straight to ShoppingListSection', () => {
    expect(page).toMatch(/const \{[^}]*\brecipeIds,[^}]*\bavgServings,[^}]*\} = controller;/);
    expect(page).toContain('<ShoppingListSection recipeIds={recipeIds} servings={avgServings} />');
  });

  it('posts those props to /api/shopping-list without transforming them', () => {
    expect(section).toContain('export default function ShoppingListSection({ recipeIds, servings = 1 })');
    expect(section).toContain('useSavedPlanShoppingList({ recipeIds, servings })');
    expect(section).not.toMatch(/recipeIds\s*=|new Set|\.filter\(|\.reduce\(/);
    expect(request).toContain('export function useSavedPlanShoppingList({ recipeIds, servings }: UseSavedPlanShoppingListOptions)');
    expect(request).toContain("fetch('/api/shopping-list'");
    expect(request).toContain('body: JSON.stringify({ recipeIds, servings })');
    expect(request).not.toMatch(/recipeIds\s*=|new Set|\.filter\(|\.reduce\(/);
  });
});
