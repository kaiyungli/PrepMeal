import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { selectHealthyGuide, selectIngredientGuide } from '@/features/guides/topicRecipes';

const row = (id: string, extra: Record<string, unknown>) => ({ id, slug: `s-${id}`, name: `菜${id}`, ...extra });

describe('ingredient guide lists', () => {
  it('groups by main protein, skips soups and complete meals, spreads cooking methods', () => {
    const data = selectIngredientGuide([
      row('1', { primary_protein: 'chicken', method: 'steamed', dish_type: 'main' }),
      row('2', { primary_protein: 'chicken', method: 'steamed', dish_type: 'main' }),
      row('3', { primary_protein: 'chicken', method: 'stir_fry', dish_type: 'main' }),
      row('4', { primary_protein: 'chicken', dish_type: 'soup' }),
      row('5', { primary_protein: 'chicken', is_complete_meal: true }),
      row('6', { primary_protein: 'vegetarian', dish_type: 'side' }),
      { id: 'bad', slug: 'a/b', name: '壞' },
    ], 2);
    expect(data.byProtein.chicken.map(r => r.id)).toEqual(['1', '3']);
    expect(data.byProtein.beef).toEqual([]);
    expect(data.vegSides.map(r => r.id)).toEqual(['6']);
  });
});

describe('healthy guide lists', () => {
  it('uses per-serving estimates and leaves out rows without calories', () => {
    const data = selectHealthyGuide([
      row('lean', { dish_type: 'main', calories_per_serving: 380, protein_g: 30 }),
      row('rich', { dish_type: 'main', calories_per_serving: 700, protein_g: 40 }),
      row('lowp', { dish_type: 'main', calories_per_serving: 300, protein_g: 10 }),
      row('nokcal', { dish_type: 'main', calories_per_serving: null, protein_g: 30 }),
      row('meal', { is_complete_meal: true, calories_per_serving: '550' }),
      row('bigmeal', { is_complete_meal: true, calories_per_serving: 800 }),
    ]);
    expect(data.leanMains.map(r => r.id)).toEqual(['lean']);
    expect(data.lighterMeals.map(r => r.id)).toEqual(['meal']);
  });
});

describe('guide text matches the 1-person rule', () => {
  it('no guide claims a 2- or 4-person original recipe', () => {
    for (const f of ['30-minute-dinner-recipes', '50-classic-hk-recipes', '7-day-dinner-plan', 'hong-kong-market-shopping-guide']) {
      const text = readFileSync(`src/pages/${f}.tsx`, 'utf8');
      expect(text).not.toMatch(/原配方(已係)?[24]人份|原本已係2人份|4人份/);
    }
  });
});

describe('sample plan', () => {
  it('computes the list with the planner code and hides when a dish is missing', async () => {
    vi.resetModules();
    const { SAMPLE_PLAN_SLUGS } = await import('@/features/guides/samplePlan');
    const { HOME_EXAMPLES } = await import('@/features/home/homeRotation');
    const HOME_SAMPLE_PLAN_DAYS = HOME_EXAMPLES[0].days;
    let rows = SAMPLE_PLAN_SLUGS.map((slug, i) => ({ id: `id-${i}`, slug, name: `菜${i}`, total_time_minutes: 10 }));
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: { from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: rows, error: null }) }) }) }) } }));
    const handle = vi.fn(async (req: { body: { recipeIds: string[]; servings: number } }, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
      res.status(200).json({
        pantry: [], summary: { pantryCount: 0, toBuyCount: 2, sectionCount: 1 },
        toBuy: [{ category: 'vegetable', items: [
          { ingredientId: 'g', name: '蒜頭', quantity: 6, unit: 'clove', unitDisplay: '瓣', category: 'vegetable', quantityPending: false },
          { ingredientId: 's', name: '菠菜', quantity: 360, unit: 'g', unitDisplay: '克', category: 'vegetable', quantityPending: false },
        ] }],
        byRecipe: [
          { recipeId: 'id-0', recipeName: '菜0', pantry: [], toBuy: [{ ingredientId: 'g', name: '蒜頭', quantity: 2, unit: '瓣' }] },
          { recipeId: 'id-1', recipeName: '菜1', pantry: [], toBuy: [{ ingredientId: 'g', name: '蒜頭', quantity: 4, unit: '瓣' }, { ingredientId: 's', name: '菠菜', quantity: 360, unit: '克' }] },
        ],
      });
    });
    vi.doMock('@/pages/api/shopping-list', () => ({ handleShoppingList: handle }));
    const { loadSamplePlan } = await import('@/features/guides/samplePlan.server');

    const plan = await loadSamplePlan();
    expect(handle.mock.calls[0][0].body).toEqual({ recipeIds: rows.map(r => r.id), servings: 2 });
    expect(plan?.days).toHaveLength(5);
    expect(plan?.itemCount).toBe(2);
    expect(plan?.sharedItems.map(i => [i.name, i.dishCount])).toEqual([['蒜頭', 2]]);

    const homeSlugs = HOME_SAMPLE_PLAN_DAYS.flatMap(d => d.slugs);
    rows = homeSlugs.map((slug, i) => ({ id: `id-${i}`, slug, name: `菜${i}`, total_time_minutes: 10 }));
    const homePlan = await loadSamplePlan(HOME_SAMPLE_PLAN_DAYS);
    expect(homePlan?.days).toHaveLength(7);
    expect(homePlan?.days.flatMap(d => d.dishes)).toHaveLength(14);
    expect(homePlan?.servings).toBe(2);
    expect(handle.mock.calls.at(-1)?.[0].body).toEqual({ recipeIds: rows.map(r => r.id), servings: 2 });
    // Homepage strict mode rejects missing ingredient groups; legacy guide mode is unchanged.
    expect(await loadSamplePlan(HOME_SAMPLE_PLAN_DAYS, rows, true)).toBeNull();
    rows = rows.slice(1);
    expect(await loadSamplePlan()).toBeNull();
    vi.doUnmock('@/lib/supabaseServer');
    vi.doUnmock('@/pages/api/shopping-list');
  });
});
