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

describe('generate catalogue pagination', () => {
  it('fetches the later page containing a premium protein main', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => recipe(`r${i}`, 'normal'));
    const laterPage = [recipe('premium-main', 'premium', { meal_role: 'protein_main' })];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recipes: firstPage, hasMore: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recipes: laterPage, hasMore: false }) });
    vi.stubGlobal('fetch', fetchMock);

    const recipes = await fetchAvailableRecipes(200);

    expect(recipes).toHaveLength(101);
    expect(recipes.at(-1)?.budget_level).toBe('premium');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/recipes?limit=100&offset=0&view=generate',
      '/api/recipes?limit=100&offset=100&view=generate',
    ]);
  });

  it('does not fetch past the requested limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ recipes: [recipe('one', 'normal')], hasMore: false }),
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchAvailableRecipes(1)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/recipes?limit=1&offset=0&view=generate');
  });

  it('rejects a failed later page instead of caching an incomplete pool', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipes: Array.from({ length: 100 }, (_, i) => recipe(`r${i}`, null)), hasMore: true }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchAvailableRecipes(200)).rejects.toThrow('HTTP 500');
  });
});
