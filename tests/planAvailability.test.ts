import { describe, expect, it } from 'vitest';
import { getPlanAvailabilityWarnings } from '@/features/generate/utils/planAvailability';
const recipe = (id: string, meal_role = 'veg_side', extra = {}) => ({ id, meal_role, ...extra });
const defaults = { recipes: [recipe('veg')], composition: 'meat_veg', daysPerWeek: 3 };

describe('generation supply warnings', () => {
  it('distinguishes zero role supply from zero total recipes', () => {
    expect(getPlanAvailabilityWarnings(defaults)).toEqual([
      expect.stringContaining('目前有 0 道可用主菜，尚需安排 3 個主菜位'),
      expect.stringContaining('目前有 1 道可用配菜，尚需安排 3 個配菜位'),
    ]);
  });
  it('updates when days decrease; ignores unlocked old selections', () => {
    const recipes = [recipe('veg'), recipe('main', 'protein_main')];
    expect(getPlanAvailabilityWarnings({ ...defaults, recipes, daysPerWeek: 1,
      weeklyPlan: { mon: [recipes[1], recipes[0]] } })).toEqual([]);
    expect(getPlanAvailabilityWarnings({ ...defaults, recipes })).toHaveLength(2);
  });
  it('deduplicates IDs and respects cuisine, exclusions and complete-meal settings', () => {
    const recipes = [recipe('a', 'protein_main', { cuisine: 'western' }),
      recipe('b', 'protein_main', { primary_protein: 'chicken' }),
      recipe('c', 'complete_meal'), recipe('veg'), recipe('veg')];
    const warnings = getPlanAvailabilityWarnings({ ...defaults, recipes, cuisines: ['chinese'],
      exclusions: ['chicken'], allowCompleteMeal: false });
    expect(warnings[0]).toContain('0 道可用主菜');
    expect(warnings[1]).toContain('1 道可用配菜');
  });
  it('credits repeated valid locks without counting those recipes again', () => {
    const a = recipe('a', 'complete_meal');
    expect(getPlanAvailabilityWarnings({ composition: 'complete_meal', recipes: [a], daysPerWeek: 2,
      weeklyPlan: { mon: [a], tue: [a] }, lockedSlots: { 'mon-0': true, 'tue-0': true } })).toEqual([]);
    expect(getPlanAvailabilityWarnings({ composition: 'complete_meal', recipes: [a], daysPerWeek: 2,
      weeklyPlan: { mon: [a] }, lockedSlots: { 'mon-0': true } })[0])
      .toContain('除已鎖定菜式外，目前有 0 道可用完整餐，尚需安排 1 個完整餐位');
  });
  it('rejects incompatible locks and reserves valid hidden locks like the planner', () => {
    const a = recipe('veg');
    const warnings = getPlanAvailabilityWarnings({ ...defaults, daysPerWeek: 1,
      weeklyPlan: { mon: [a], sun: [null, a] }, lockedSlots: { 'mon-0': true, 'sun-1': true } });
    expect(warnings[0]).toContain('尚需安排 1 個主菜位');
    expect(warnings[1]).toContain('0 道可用配菜');
  });
  it('accounts for two-main demand and one complete meal per day', () => {
    const recipes = Array.from({ length: 6 }, (_, i) => recipe(String(i), 'complete_meal'));
    expect(getPlanAvailabilityWarnings({ recipes, composition: 'two_meat_one_veg',
      daysPerWeek: 3, allowCompleteMeal: true })[0]).toContain('3 道可用主菜，尚需安排 6 個主菜位');
  });
  it('respects a complete meal already locked in a mixed day', () => {
    const a = recipe('a', 'complete_meal'), b = recipe('b', 'complete_meal');
    expect(getPlanAvailabilityWarnings({ recipes: [a, b, recipe('veg')], composition: 'two_meat_one_veg',
      daysPerWeek: 1, allowCompleteMeal: true, weeklyPlan: { mon: [a] }, lockedSlots: { 'mon-0': true } }))
      .toEqual([expect.stringContaining('0 道可用主菜，尚需安排 1 個主菜位')]);
  });
});
