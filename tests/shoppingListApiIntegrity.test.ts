import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { ShoppingListResponse } from '@/features/shopping-list/types';

// Production path: POST /api/shopping-list with only Supabase faked.

const { requireAuthMock, createClientMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock('../src/pages/api/user/_auth.js', () => ({ requireAuth: requireAuthMock }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import handler from '../src/pages/api/shopping-list';

const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const PRIVATE = '33333333-3333-4333-8333-333333333333';

type Row = {
  is_optional?: boolean;
  quantity: unknown; recipe_id: string; ingredient_id: string | null;
  ingredients: { id: string; name: string; slug?: string; shopping_category: string | null };
  recipes: { id: string; name: string; base_servings?: number };
  units: { id: string; code: string; display_name_en: string; display_name_zh: string } | null;
};

const UNITS: Record<string, Row['units']> = {
  g: { id: 'u-g', code: 'g', display_name_en: 'gram', display_name_zh: '克' },
  gram: { id: 'u-gram', code: 'gram', display_name_en: 'gram', display_name_zh: '克' },
  kg: { id: 'u-kg', code: 'kg', display_name_en: 'kilogram', display_name_zh: '千克' },
  piece: { id: 'u-pc', code: 'piece', display_name_en: 'piece', display_name_zh: '件' },
  tsp: { id: 'u-tsp', code: 'tsp', display_name_en: 'tsp', display_name_zh: '茶匙' },
};

const row = (recipeId: string, ingredientId: string, name: string, quantity: unknown, unit: string | null, category: string | null = 'meat'): Row => ({
  quantity, recipe_id: recipeId, ingredient_id: ingredientId,
  ingredients: { id: ingredientId, name, shopping_category: category },
  recipes: { id: recipeId, name: `Recipe ${recipeId.slice(0, 1)}` },
  units: unit ? UNITS[unit] : null,
});

function fakeDatabase(rows: Row[], publicIds = [R1, R2], bases: Record<string, number> = {}, diets: Record<string, string[]> = {}) {
  const calls = { recipeIdsQueried: [] as string[][], ingredientIdsQueried: [] as string[][], preferenceUserIds: [] as string[] };
  return {
    calls,
    client: {
      from: (table: string) => {
        if (table === 'user_preferences') {
          return { select: () => ({ eq: (_c: string, userId: string) => {
            calls.preferenceUserIds.push(userId);
            return { single: async () => ({ data: { unit_language: 'zh' } }) };
          } }) };
        }
        if (table === 'recipes') {
          return { select: () => ({ in: (_c: string, ids: string[]) => ({ eq: async () => {
            calls.recipeIdsQueried.push(ids);
            return { data: ids.filter((id) => publicIds.includes(id)).map((id) => ({ id, base_servings: bases[id], diet: diets[id] })), error: null };
          } }) }) };
        }
        if (table === 'recipe_ingredients') {
          return { select: (columns: string) => {
            // Enforce the real schema rather than silently accepting any query.
            if (/(^|,)\s*optional\s*(,|$)/.test(columns)) throw new Error('column optional does not exist');
            if (!/\bis_optional\b/.test(columns)) throw new Error('required is_optional column missing');
            return { in: async (_c: string, ids: string[]) => {
            calls.ingredientIdsQueried.push(ids);
            return { data: rows.filter((r) => ids.includes(r.recipe_id)), error: null };
          } }; } };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    },
  };
}

async function post(body: Record<string, unknown>, rows: Row[], publicIds?: string[], diets?: Record<string, string[]>) {
  const db = fakeDatabase(rows, publicIds, {}, diets);
  createClientMock.mockReturnValue(db.client);
  const res = { statusCode: 200, body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; } };
  await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body } as unknown as NextApiRequest, res as unknown as NextApiResponse);
  const response = res.body as ShoppingListResponse;
  const items = res.statusCode === 200 ? response.toBuy.flatMap((s) => s.items) : [];
  return { status: res.statusCode, response, items, db };
}

const line = (i: { ingredientId: string | null; quantity: number | null; unit: string }) => `${i.ingredientId}:${i.quantity}:${i.unit}`;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-secret';
  requireAuthMock.mockResolvedValue('user-a');
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('/api/shopping-list aggregation', () => {
  it('applies explicit optional choices without removing required ingredients and retains choices after deselection', async () => {
    const required = row(R1, 'chicken', '雞肉', 250, 'g');
    const beef = { ...row(R1, 'beef', '牛肉', 250, 'g'), is_optional: true };
    const shrimp = { ...row(R1, 'shrimp', '蝦', 250, 'g'), is_optional: true };
    const selected = await post({ recipeIds: [R1, R1], servings: 2, optionalSelections: { [R1]: ['beef'] } }, [required, beef, shrimp]);
    expect(selected.items.map(line).sort()).toEqual(['beef:1000:g', 'chicken:1000:g']);
    expect(selected.response.optionalIngredients?.[0].ingredients.map(item => item.name)).toEqual(['牛肉', '蝦']);
    const base = await post({ recipeIds: [R1], servings: 1, optionalSelections: { [R1]: [] } }, [required, beef, shrimp]);
    expect(base.items.map(line)).toEqual(['chicken:250:g']);
    expect(base.response.optionalIngredients?.[0].ingredients).toHaveLength(2);
    const other = await post({ recipeIds: [R1], optionalSelections: { [R2]: [] } }, [required, beef, shrimp]);
    expect(other.items.map(line)).toEqual(['chicken:250:g']);
    const unset = await post({ recipeIds: [R1] }, [required, beef, shrimp]);
    expect(unset.items.map(line)).toEqual(['chicken:250:g']);
    expect(unset.response.optionalIngredients?.[0].ingredients).toHaveLength(2);
  });

  it.each([null, [], { x: 'beef' }, { x: [1] }])('rejects malformed optional selections: %j', async optionalSelections => {
    expect((await post({ recipeIds: [R1], optionalSelections }, [])).status).toBe(400);
  });

  it('requires a vegetarian-labelled composite product and does not expose animal add-ons as choices', async () => {
    const kimchi = row(R1, 'kimchi', '泡菜', 80, 'g'); kimchi.ingredients.slug = 'kimchi';
    const chicken = { ...row(R1, 'chicken', '雞肉', 80, 'g'), is_optional: true };
    chicken.ingredients.slug = 'chicken';
    const result = await post({ recipeIds: [R1] }, [kimchi, chicken], undefined, { [R1]: ['vegetarian'] });
    expect(result.response.dietaryNotes?.join('')).toContain('泡菜須選包裝標明適合素食');
    expect(result.response.optionalIngredients).toEqual([]);
  });

  it('uses the vegetarian base without animal add-ons, preserving dairy, plant add-ons and required rows', async () => {
    const chicken = row(R1, 'chicken', '熟去皮雞肉', 80, 'g');
    chicken.is_optional = true; chicken.ingredients.slug = 'cooked-skinless-chicken';
    const shrimp = { ...row(R1, 'shrimp', '蝦', 100, 'g'), is_optional: true };
    const butter = { ...row(R1, 'butter', '牛油', 10, 'g'), is_optional: true };
    const tofu = { ...row(R1, 'tofu', '豆腐', 50, 'g'), is_optional: true };
    const required = row(R2, 'shrimp', '蝦', 30, 'g');
    const { items, response } = await post({ recipeIds: [R1, R2], servings: 1 },
      [chicken, shrimp, butter, tofu, required], undefined, { [R1]: ['vegetarian', 'egg_lacto'] });
    expect(items.map(line).sort()).toEqual(['shrimp:30:g']);
    expect(JSON.stringify(response.byRecipe)).not.toContain('熟去皮雞肉');
    expect(response.byRecipe.find(group => group.recipeId === R1)?.toBuy.map(item => item.name) ?? []).not.toContain('蝦');
    const chosen = await post({ recipeIds: [R1], optionalSelections: { [R1]: ['butter', 'tofu', 'chicken'] } },
      [chicken, shrimp, butter, tofu], undefined, { [R1]: ['vegetarian', 'egg_lacto'] });
    expect(chosen.items.map(line).sort()).toEqual(['butter:10:g', 'tofu:50:g']);
    const ordinary = await post({ recipeIds: [R1], servings: 1 }, [chicken, shrimp]);
    expect(ordinary.items).toHaveLength(0);
  });
  it('sums the same ingredient in the same (normalized) unit across recipes', async () => {
    const { items } = await post({ recipeIds: [R1, R2], servings: 1 }, [
      row(R1, 'beef', '牛肉', 100, 'g'), row(R2, 'beef', '牛肉', 50, 'gram'),
    ]);
    expect(items.map(line)).toEqual(['beef:150:g']);
  });

  it('converts fixed-ratio mass units but keeps count-based units separate', async () => {
    const { items } = await post({ recipeIds: [R1, R2], servings: 1 }, [
      row(R1, 'beef', '牛肉', 100, 'g'), row(R2, 'beef', '牛肉', 1, 'kg'), row(R2, 'beef', '牛肉', 2, 'piece'),
    ]);
    expect(items.map(line)).toEqual(['beef:1100:g', 'beef:2:件']);
  });

  it('scales by servings and by how often a recipe is planned', async () => {
    const { items, db } = await post({ recipeIds: [R1, R1, R2], servings: 3 }, [
      row(R1, 'beef', '牛肉', 100, 'g'), row(R2, 'beef', '牛肉', 10, 'g'),
    ]);
    // (100 * 2 occurrences + 10) * 3 servings
    expect(items.map(line)).toEqual(['beef:630:g']);
    expect(db.calls.ingredientIdsQueried).toEqual([[R1, R2]]);
  });

  it('rejects non-positive or non-numeric servings', async () => {
    for (const servings of [0, -1, Number.NaN, '2']) {
      const { status } = await post({ recipeIds: [R1], servings }, [row(R1, 'beef', '牛肉', 1, 'g')]);
      expect(status, String(servings)).toBe(servings === '2' ? 200 : 400);
    }
  });
});

describe('/api/shopping-list quantities', () => {
  it('lists an ingredient with a missing or zero amount without inventing one', async () => {
    const { items } = await post({ recipeIds: [R1], servings: 2 }, [
      row(R1, 'salt', '鹽', null, 'tsp', 'seasoning'), row(R1, 'oil', '油', 0, null, 'seasoning'),
    ]);
    expect(items.map((i) => [i.name, i.quantity])).toEqual([['鹽', 0], ['油', 0]]);
  });

  it('keeps the known total when a missing amount merges with a known one', async () => {
    const { items } = await post({ recipeIds: [R1, R2], servings: 1 }, [
      row(R1, 'salt', '鹽', null, 'tsp', 'seasoning'), row(R2, 'salt', '鹽', 2, 'tsp', 'seasoning'),
    ]);
    expect(items.map(line)).toEqual(['salt:2:tsp']);
  });

  it('never reports a negative, NaN or non-numeric amount', async () => {
    const { items, response } = await post({ recipeIds: [R1, R2], servings: 2 }, [
      row(R1, 'beef', '牛肉', -5, 'g'), row(R2, 'beef', '牛肉', 100, 'g'),
      row(R1, 'pork', '豬肉', 'NaN', 'g'), row(R1, 'fish', '魚', 'abc', 'g'),
      row(R1, 'tofu', '豆腐', Number.POSITIVE_INFINITY, 'piece', 'tofu'),
    ]);
    expect(items.map(line)).toEqual(['beef:200:g', 'pork:0:g', 'fish:0:g', 'tofu:0:件']);
    for (const group of response.byRecipe) {
      for (const i of group.toBuy) expect(Number.isFinite(i.quantity) && (i.quantity ?? 0) >= 0, i.name).toBe(true);
    }
  });

  it('accepts numeric strings as returned for numeric columns', async () => {
    const { items } = await post({ recipeIds: [R1], servings: 2 }, [row(R1, 'beef', '牛肉', '1.5', 'g')]);
    expect(items.map(line)).toEqual(['beef:3:g']);
  });
});

describe('/api/shopping-list pantry and categories', () => {
  it('moves pantry ingredients out of to-buy and lists each once, across units and recipes', async () => {
    const { items, response } = await post({ recipeIds: [R1, R2], servings: 1, pantryIngredients: ['雞蛋', ' 鹽 '] }, [
      row(R1, 'egg', '蛋', 2, 'piece', 'egg'), row(R2, 'egg', '蛋', 50, 'g', 'egg'),
      row(R1, 'salt', '鹽', 1, 'tsp', 'seasoning'), row(R2, 'beef', '牛肉', 100, 'g'),
    ]);
    expect(response.pantry.map((p) => p.ingredientId)).toEqual(['egg', 'salt']);
    expect(items.map(line)).toEqual(['beef:100:g']);
    expect(response.summary).toEqual({ pantryCount: 2, toBuyCount: 1, sectionCount: 1 });
    expect(response.byRecipe.flatMap((g) => g.toBuy.map((i) => i.ingredientId))).toEqual(['beef']);
  });

  it('does not treat a different ingredient containing a pantry word as owned', async () => {
    const { items, response } = await post({ recipeIds: [R1], servings: 1, pantryIngredients: ['油'] }, [
      row(R1, 'sesame-oil', '麻油', 1, 'tsp', 'seasoning'),
    ]);
    expect(response.pantry).toEqual([]);
    expect(items.map((i) => i.ingredientId)).toEqual(['sesame-oil']);
  });

  it('groups unknown and missing categories under other instead of dropping them', async () => {
    const { response } = await post({ recipeIds: [R1], servings: 1 }, [
      row(R1, 'beef', '牛肉', 1, 'g', 'meat'), row(R1, 'x', '神秘食材', 1, 'g', 'not_a_category'),
      row(R1, 'y', '無類別', 1, 'g', null),
    ]);
    expect(response.toBuy.map((s) => [s.category, s.items.map((i) => i.ingredientId)])).toEqual([
      ['meat', ['beef']], ['other', ['x', 'y']],
    ]);
  });

  it('skips rows without an ingredient id', async () => {
    const { items } = await post({ recipeIds: [R1], servings: 1 }, [
      { ...row(R1, 'beef', '牛肉', 1, 'g'), ingredient_id: null }, row(R1, 'pork', '豬肉', 1, 'g'),
    ]);
    expect(items.map((i) => i.ingredientId)).toEqual(['pork']);
  });
});

describe('/api/shopping-list authentication and isolation', () => {
  it('stops before any database access when unauthenticated', async () => {
    requireAuthMock.mockImplementation(async (_req, res) => { res.status(401).json({ error: 'Unauthorized' }); return null; });
    const { status } = await post({ recipeIds: [R1] }, []);
    expect(status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('reads preferences for the verified user only, ignoring a client-supplied user id', async () => {
    const { db } = await post({ recipeIds: [R1], servings: 1, userId: 'user-b' }, [row(R1, 'beef', '牛肉', 1, 'g')]);
    expect(db.calls.preferenceUserIds).toEqual(['user-a']);
  });

  it('never reads ingredients of a private recipe and reports it only as a count', async () => {
    const { items, response, db } = await post({ recipeIds: [R1, PRIVATE, PRIVATE], servings: 1 }, [
      row(R1, 'beef', '牛肉', 1, 'g'), row(PRIVATE, 'secret', '秘密', 1, 'g'),
    ]);
    expect(db.calls.ingredientIdsQueried).toEqual([[R1]]);
    expect(items.map((i) => i.ingredientId)).toEqual(['beef']);
    expect(response.unavailableRecipeCount).toBe(2);
    expect(JSON.stringify(response)).not.toContain('秘密');
  });
});


describe('recipe base servings regression', () => {
  it.each([[1, 1, 180], [2, 1, 360], [4, 1, 720], [1, 2, 360], [2, 2, 720]])(
    '%i people with %i occurrences uses %ig noodles', async (servings, occurrences, expected) => {
      requireAuthMock.mockResolvedValue('user-a');
      const db = fakeDatabase([row(R1, 'noodles', '麵', 360, 'g')], [R1], { [R1]: 2 });
      createClientMock.mockReturnValue(db.client);
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await handler({ method: 'POST', headers: {}, body: { recipeIds: Array(occurrences).fill(R1), servings } } as never, res as never);
      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0] as ShoppingListResponse;
      expect(body.toBuy.flatMap(section => section.items)).toEqual([expect.objectContaining({ quantity: expected })]);
    });
});
