import { afterEach, describe, expect, it, vi } from 'vitest';
import { planWeekAdvanced } from '@/lib/mealPlanner';
import { matchesBudgetPreference, preferBudgetRecipes } from '@/features/generate/engine/budgetPreference';
import { replaceRecipeInPlan } from '@/features/generate/engine/recipeReplacer';

const recipe = (id: string, budget_level: string | null, extra = {}) => ({
  id, name: id, budget_level, meal_role: 'complete_meal', is_complete_meal: true,
  dish_type: 'main', total_time_minutes: id === 'cheap' ? 90 : 10,
  method: id === 'cheap' ? 'braised' : 'stir_fry',
  ...extra,
});

const cheap = recipe('cheap', 'budget');
const expensive = recipe('expensive', 'premium');
const unlabelled = recipe('unlabelled', null);

afterEach(() => vi.restoreAllMocks());

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
});
