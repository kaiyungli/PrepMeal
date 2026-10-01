import { afterEach, describe, expect, it, vi } from 'vitest';
import { planWeekAdvanced } from '@/lib/mealPlanner';
import { matchesBudgetPreference, preferBudgetRecipes } from '@/features/generate/engine/budgetPreference';
import { replaceRecipeInPlan } from '@/features/generate/engine/recipeReplacer';
import { fetchAvailableRecipes } from '@/features/generate/services/fetchAvailableRecipes';

const recipe = (id: string, budget_level: string | null, extra = {}) => ({
  id, name: id, budget_level, meal_role: 'complete_meal', is_complete_meal: true,
  dish_type: 'main', total_time_minutes: id === 'cheap' ? 90 : 10,
  method: id === 'cheap' ? 'braised' : 'stir_fry',
  ...extra,
});

const cheap = recipe('cheap', 'budget');
const expensive = recipe('expensive', 'premium');
const unlabelled = recipe('unlabelled', null);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('canonical recipe budget preference', () => {
  it('uses budget_level rather than cooking time or method', () => {
    expect(matchesBudgetPreference(cheap, 'budget')).toBe(true);
    expect(matchesBudgetPreference(expensive, 'budget')).toBe(false);
    expect(matchesBudgetPreference(expensive, 'premium')).toBe(true);
    expect(matchesBudgetPreference(cheap, 'normal')).toBe(false);
  });

  it('falls back to the eligible pool when the requested tier is absent', () => {
    expect(preferBudgetRecipes([expensive, unlabelled], 'budget')).toEqual([expensive, unlabelled]);
    expect(preferBudgetRecipes([expensive, cheap], 'budget')).toEqual([cheap]);
    expect(preferBudgetRecipes([expensive, cheap], 'normal')).toEqual([expensive, cheap]);
  });

  it('initial generation changes selection with the chosen tier and keeps locked slots', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const config = {
      daysPerWeek: 1, dishesPerDay: 1, slotRoles: ['complete_meal'],
      dailyComposition: 'complete_meal', isWeekend: () => false,
    };
    const select = (budget: string) => planWeekAdvanced([expensive, cheap], { ...config, budget }).mon[0].id;
    expect(select('budget')).toBe('cheap');
    expect(select('premium')).toBe('expensive');
    expect(planWeekAdvanced([expensive], { ...config, budget: 'budget' }).mon[0].id).toBe('expensive');
    expect(planWeekAdvanced([expensive, cheap], {
      ...config, budget: 'budget',
      lockedSlots: { 'mon-0': true }, lockedRecipes: { 'mon-0': expensive },
    }).mon[0].id).toBe('expensive');
  });

  it('replacement respects the labelled tier and falls back when unavailable', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const plan = { mon: [recipe('original', 'normal')] };
    expect(replaceRecipeInPlan(plan, 'mon', 0, [cheap, expensive], {
      dailyComposition: 'complete_meal', budget: 'budget',
    })?.mon[0].id).toBe('cheap');
    expect(replaceRecipeInPlan(plan, 'mon', 0, [expensive], {
      dailyComposition: 'complete_meal', budget: 'budget',
    })?.mon[0].id).toBe('expensive');
  });

  it('prefers the requested tier among equally perfect pantry matches', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const config = {
      daysPerWeek: 1, dishesPerDay: 1, slotRoles: ['complete_meal'],
      dailyComposition: 'complete_meal', isWeekend: () => false,
      pantryIngredients: ['雞蛋'], budget: 'premium',
    };
    const recipes = [
      recipe('pantry-budget', 'budget', { ingredients_list: ['雞蛋'] }),
      recipe('pantry-premium', 'premium', { ingredients_list: ['雞蛋'] }),
    ];
    expect(planWeekAdvanced(recipes, config).mon[0].id).toBe('pantry-premium');
  });
});

describe('generate complete catalogue', () => {
  it('receives a premium protein main that sits beyond the first 100 recipes', async () => {
    const pool = [
      ...Array.from({ length: 100 }, (_, i) => recipe(`r${i}`, 'normal')),
      recipe('premium-main', 'premium', { meal_role: 'protein_main' }),
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ recipes: pool, total: pool.length, complete: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const recipes = await fetchAvailableRecipes();

    expect(recipes).toHaveLength(101);
    expect(recipes.at(-1)?.budget_level).toBe('premium');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/recipes?view=generate']);
  });

  it('rejects an incomplete pool instead of planning from it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recipes: Array.from({ length: 100 }, (_, i) => recipe(`r${i}`, null)), total: 101, complete: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchAvailableRecipes()).rejects.toThrow('incomplete');
  });

  it('rejects a failed catalogue request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchAvailableRecipes()).rejects.toThrow('HTTP 500');
  });
});
