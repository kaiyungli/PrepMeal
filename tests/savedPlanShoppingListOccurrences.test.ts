// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { NextApiRequest, NextApiResponse } from 'next';

// A saved plan stores one menu_plan_items row per planned meal, so the same
// recipe can appear on several days or in several meal slots. Every one of
// those rows must reach /api/shopping-list, which counts occurrences.
//
// This drives the real /my-plans/[id] page, usePlanDetailController,
// getPlanDetail, ShoppingListSection and both real API handlers
// (/api/user/menus/[id] and /api/shopping-list) against a fake Supabase.

const { requireAuthMock, createClientMock, drawerProps } = vi.hoisted(() => {
  // _auth.js builds its JWKS URL from this at import time.
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  return {
  requireAuthMock: vi.fn(),
  createClientMock: vi.fn(),
  drawerProps: { current: null as null | { shoppingList: ShoppingList | null; loading: boolean } },
  };
});

type ShoppingList = {
  byCategory: { pantry: unknown[]; toBuy: Record<string, Array<{ name: string; unit: string; quantity: number }>> };
  byRecipe: Array<{ recipeName: string; toBuy: Array<{ name: string; quantity: number }> }>;
};

vi.mock('../src/pages/api/user/_auth.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requireAuth: requireAuthMock,
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

vi.mock('next/router', () => ({ useRouter: () => ({ query: { id: currentPlanId } }) }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: unknown; href: string }) => createElement('a', { href }, children as never),
}));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({ useHeaderController: () => ({}) }));
vi.mock('@/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ isAuthenticated: true, loading: false, getAccessToken: async () => 'token', user: { id: 'user-1' } }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ getAccessToken: async () => 'token' }) }));
vi.mock('@/components/RecipeDetailModal', () => ({ default: () => null }));
vi.mock('@/features/recipes/hooks/useRecipeDetailModal', () => ({
  useRecipeDetailModal: () => ({ recipe: null, loading: false, error: null, close: () => {} }),
}));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => ({ prefetchRecipeDetail: () => {} }));
// The drawer is presentation only; capture what ShoppingListSection gives it.
vi.mock('@/components/shopping/ShoppingListDrawer', () => ({
  default: (props: { shoppingList: ShoppingList | null; loading: boolean }) => {
    drawerProps.current = props;
    return null;
  },
}));

import PlanDetailPage from '../src/pages/my-plans/[id].js';
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

let currentPlanId = 'plan-1';
let plans: Record<string, PlanRow[]> = {};
let shoppingListBodies: Array<{ recipeIds: string[]; servings: number }> = [];

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
  return { ok: res.statusCode < 400, status: res.statusCode, json: async () => res.body };
}

// Routes the page's fetch calls to the real API handlers.
async function routeFetch(url: string, init?: RequestInit) {
  const menuMatch = url.match(/^\/api\/user\/menus\/([^/?]+)$/);
  if (menuMatch) {
    return callHandler(menuDetailHandler as never, { method: 'GET', query: { id: menuMatch[1] } });
  }
  if (url === '/api/shopping-list') {
    const body = JSON.parse(String(init?.body));
    shoppingListBodies.push(body);
    return callHandler(shoppingListHandler as never, { method: 'POST', body });
  }
  throw new Error(`Unexpected fetch: ${url}`);
}

async function openSavedPlan(planId: string) {
  currentPlanId = planId;
  const view = render(createElement(PlanDetailPage));
  const trigger = await screen.findByText('查看購物清單');
  await act(async () => { fireEvent.click(trigger); });
  await waitFor(() => expect(drawerProps.current?.shoppingList).toBeTruthy());
  return { view, shoppingList: drawerProps.current!.shoppingList!, request: shoppingListBodies.at(-1)! };
}

function toBuy(list: ShoppingList): Record<string, number> {
  return Object.fromEntries(Object.values(list.byCategory.toBuy).flat().map((item) => [item.name, item.quantity]));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-secret';
  requireAuthMock.mockResolvedValue('user-1');
  createClientMock.mockImplementation(fakeSupabase);
  vi.stubGlobal('fetch', vi.fn(routeFetch));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  plans = {};
  shoppingListBodies = [];
  drawerProps.current = null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const dinner = (date: string, recipeId: string | null, servings = 2, mealSlot = 'dinner'): PlanRow => ({
  date, meal_slot: mealSlot, recipe_id: recipeId, servings,
});

describe('/my-plans/[id] shopping list occurrences', () => {
  it('sends a single saved recipe once', async () => {
    plans['plan-1'] = [dinner('2026-10-05', RECIPE_A, 1)];

    const { request, shoppingList } = await openSavedPlan('plan-1');

    expect(request).toEqual({ recipeIds: [RECIPE_A], servings: 1 });
    expect(toBuy(shoppingList)).toEqual({ 雞蛋: 2, 番茄: 1 });
  });

  it('sends a recipe saved on two days twice and doubles its ingredients', async () => {
    plans['plan-1'] = [dinner('2026-10-05', RECIPE_A, 1), dinner('2026-10-06', RECIPE_A, 1)];

    const { request, shoppingList } = await openSavedPlan('plan-1');

    expect(request.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
    expect(toBuy(shoppingList)).toEqual({ 雞蛋: 4, 番茄: 2 });
  });

  it('preserves every occurrence of [A, B, A] in plan order', async () => {
    plans['plan-1'] = [dinner('2026-10-05', RECIPE_A, 1), dinner('2026-10-06', RECIPE_B, 1), dinner('2026-10-07', RECIPE_A, 1)];

    const { request, shoppingList } = await openSavedPlan('plan-1');

    expect(request.recipeIds).toEqual([RECIPE_A, RECIPE_B, RECIPE_A]);
    // eggs: A 2 x 2 + B 3 x 1
    expect(toBuy(shoppingList)).toEqual({ 雞蛋: 7, 番茄: 2, 豆腐: 1 });
  });

  it('counts the same recipe in different meal slots of one day separately', async () => {
    plans['plan-1'] = [dinner('2026-10-05', RECIPE_A, 1, 'lunch'), dinner('2026-10-05', RECIPE_A, 1, 'dinner')];

    const { request, shoppingList } = await openSavedPlan('plan-1');

    expect(request.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
    expect(toBuy(shoppingList)).toEqual({ 雞蛋: 4, 番茄: 2 });
  });

  it('counts the same recipe twice in one slot (different item_order) separately', async () => {
    plans['plan-1'] = [
      { ...dinner('2026-10-05', RECIPE_A, 1), item_order: 1 },
      { ...dinner('2026-10-05', RECIPE_A, 1), item_order: 2 },
    ];

    const { request } = await openSavedPlan('plan-1');

    expect(request.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
  });

  it('passes the saved servings and composes them with occurrences', async () => {
    plans['plan-1'] = [dinner('2026-10-05', RECIPE_A, 3), dinner('2026-10-06', RECIPE_A, 3), dinner('2026-10-07', RECIPE_B, 3)];

    const { request, shoppingList } = await openSavedPlan('plan-1');

    expect(request).toEqual({ recipeIds: [RECIPE_A, RECIPE_A, RECIPE_B], servings: 3 });
    // eggs: (2 x 2 + 3 x 1) x 3
    expect(toBuy(shoppingList)).toEqual({ 雞蛋: 21, 番茄: 6, 豆腐: 3 });
    // byRecipe keeps one group per recipe with its total across occurrences.
    expect(shoppingList.byRecipe.map((group) => [group.recipeName, group.toBuy.map((item) => item.quantity)])).toEqual([
      ['番茄炒蛋', [12, 6]],
      ['蒸豆腐', [9, 3]],
    ]);
  });

  it('does not reuse one saved plan\'s list for another with a different multiplicity', async () => {
    plans['plan-single'] = [dinner('2026-10-05', RECIPE_A, 1)];
    plans['plan-double'] = [dinner('2026-10-05', RECIPE_A, 1), dinner('2026-10-06', RECIPE_A, 1)];

    const first = await openSavedPlan('plan-single');
    first.view.unmount();
    drawerProps.current = null;
    const second = await openSavedPlan('plan-double');

    expect(shoppingListBodies.map((body) => body.recipeIds)).toEqual([[RECIPE_A], [RECIPE_A, RECIPE_A]]);
    expect(toBuy(first.shoppingList)).toEqual({ 雞蛋: 2, 番茄: 1 });
    expect(toBuy(second.shoppingList)).toEqual({ 雞蛋: 4, 番茄: 2 });
  });

  it('renders every saved item under its day, repeats included', async () => {
    plans['plan-1'] = [dinner('2026-10-05', RECIPE_A), dinner('2026-10-06', RECIPE_B), dinner('2026-10-07', RECIPE_A)];
    currentPlanId = 'plan-1';

    render(createElement(PlanDetailPage));

    await screen.findByText('查看購物清單');
    expect(screen.getAllByText('番茄炒蛋')).toHaveLength(2);
    expect(screen.getAllByText('蒸豆腐')).toHaveLength(1);
    expect(shoppingListBodies).toEqual([]);
  });
});

describe('usePlanDetailController', () => {
  async function loadController(rows: PlanRow[]) {
    plans['plan-1'] = rows;
    const { result } = renderHook(() => usePlanDetailController({
      planId: 'plan-1', isAuthenticated: true, userId: 'user-1', getAccessToken: async () => 'token',
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    return result.current;
  }

  it('drops items without a recipe but keeps every other occurrence', async () => {
    const controller = await loadController([
      dinner('2026-10-05', RECIPE_A),
      dinner('2026-10-05', null, 2, 'lunch'),
      dinner('2026-10-06', RECIPE_A),
    ]);

    expect(controller.items).toHaveLength(3);
    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_A]);
  });

  it('keeps day grouping and plan order unchanged', async () => {
    const controller = await loadController([
      dinner('2026-10-05', RECIPE_A), dinner('2026-10-06', RECIPE_B), dinner('2026-10-06', RECIPE_A, 2, 'lunch'),
    ]);

    expect(Object.fromEntries(Object.entries(controller.groupedItems).map(([day, items]) => [day, items.map((i) => i.recipe_id)])))
      .toEqual({ 0: [RECIPE_A], 1: [RECIPE_B, RECIPE_A] });
    expect(controller.recipeIds).toEqual([RECIPE_A, RECIPE_B, RECIPE_A]);
    expect(controller.avgServings).toBe(2);
  });

  it('returns no recipe ids for a plan with no usable items', async () => {
    const controller = await loadController([dinner('2026-10-05', null)]);

    expect(controller.recipeIds).toEqual([]);
    expect(controller.avgServings).toBe(2);
  });
});
