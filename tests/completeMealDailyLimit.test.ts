import { afterEach, describe, expect, it, vi } from 'vitest';
import { planWeekAdvanced, matchesSlotRole } from '@/lib/mealPlanner';
import { fitsDailyCompleteMealLimit } from '@/lib/slotRoles';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { replaceRecipeInPlan } from '@/features/generate/engine/recipeReplacer';
import { getCandidatesForAddRandom } from '@/features/generate/hooks/useGenerateHandlers';
import { summarizeGeneratedPlan, buildGenerateFeedback } from '@/features/generate/utils/planFeedback';

// At most one complete meal per day, in every composition and through every
// selection path: generate, locked recipes, perfect pantry match, replace, add.

const recipe = (id: string, meal_role: string, dish_type: string, primary_protein?: string, extra: object = {}) => ({
  id, name: id, meal_role, dish_type, primary_protein,
  is_complete_meal: meal_role === 'complete_meal', method: id, cuisine: 'chinese', ...extra,
});
const complete = (n: number, protein = ['chicken', 'pork', 'beef', 'fish', 'shrimp', 'egg', 'tofu'][n % 7]) =>
  recipe(`complete-${n}`, 'complete_meal', 'main', protein);
const main = (n: number, protein = ['pork', 'beef', 'fish', 'chicken', 'shrimp', 'egg', 'tofu'][n % 7]) =>
  recipe(`main-${n}`, 'protein_main', 'main', protein);
const veg = (n: number) => recipe(`veg-${n}`, 'veg_side', 'side');

const configFor = (mode: keyof typeof COMPOSITION_CONFIG, daysPerWeek = 1, extra: object = {}) => ({
  daysPerWeek, dishesPerDay: COMPOSITION_CONFIG[mode].dishesPerDay, slotRoles: COMPOSITION_CONFIG[mode].slotRoles,
  dailyComposition: mode, isWeekend: () => false, ...extra,
});

type Slot = { id: string } | null | undefined;
const completeCountPerDay = (plan: Record<string, Slot[]>) =>
  Object.values(plan).map(day => day.filter(r => matchesSlotRole(r as never, 'complete_meal')).length);

afterEach(() => vi.restoreAllMocks());

describe('fitsDailyCompleteMealLimit', () => {
  it('allows one complete meal per day and never a second', () => {
    expect(fitsDailyCompleteMealLimit(complete(1), [main(1), null, veg(1)])).toBe(true);
    expect(fitsDailyCompleteMealLimit(complete(1), [complete(2), veg(1)])).toBe(false);
    expect(fitsDailyCompleteMealLimit(main(1), [complete(2)])).toBe(true);
    expect(fitsDailyCompleteMealLimit(null, [complete(2)])).toBe(true);
    // the flag alone counts, as it does for complete-meal slots
    expect(fitsDailyCompleteMealLimit(recipe('flag', '', 'main', 'pork', { is_complete_meal: true }), [complete(2)])).toBe(false);
  });
});

describe('generate: at most one complete meal per day', () => {
  it('two_meat_one_veg with only complete meals for protein: one per day, the other protein slot stays empty', () => {
    const plan = planWeekAdvanced([complete(1), complete(2), complete(3), complete(4), veg(1), veg(2)],
      configFor('two_meat_one_veg', 2, { allowCompleteMeal: true }));
    expect(completeCountPerDay(plan)).toEqual([1, 1]);
    for (const day of Object.values(plan)) {
      expect(day).toHaveLength(3);
      expect(day.filter(r => r === null)).toHaveLength(1);
      expect(matchesSlotRole(day[2], 'veg_side')).toBe(true);
    }
    // existing empty-slot feedback explains it
    const feedback = buildGenerateFeedback(summarizeGeneratedPlan(plan, COMPOSITION_CONFIG.two_meat_one_veg.slotRoles, {}, {}));
    expect(feedback).toBe('有 2 個餐位找不到符合條件的主菜，已留空。可放寬篩選條件或改選其他餐式。');
  });

  it('two_meat_one_veg pairs a complete meal with an ordinary main rather than a second complete meal', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const plan = planWeekAdvanced([complete(1), complete(2), main(1), veg(1)], configFor('two_meat_one_veg', 1, { allowCompleteMeal: true }));
    expect(completeCountPerDay(plan)).toEqual([1]);
    expect(plan.mon.filter(Boolean)).toHaveLength(3);
    expect(plan.mon.map(r => r?.id)).toContain('main-1');
  });

  it('allowCompleteMeal=false still excludes complete meals entirely', () => {
    const plan = planWeekAdvanced([complete(1), complete(2), main(1), veg(1)], configFor('two_meat_one_veg', 1, { allowCompleteMeal: false }));
    expect(completeCountPerDay(plan)).toEqual([0]);
    expect(plan.mon.map(r => r?.id ?? null)).toEqual(['main-1', null, 'veg-1']);
  });

  it('meat_veg: at most one complete meal per day, veg slot unaffected', () => {
    const plan = planWeekAdvanced([complete(1), complete(2), veg(1), veg(2)], configFor('meat_veg', 2, { allowCompleteMeal: true }));
    expect(completeCountPerDay(plan)).toEqual([1, 1]);
    expect(Object.values(plan).every(day => matchesSlotRole(day[1], 'veg_side'))).toBe(true);
  });

  it('complete_meal mode: one complete meal per day; short supply leaves later days empty', () => {
    const plan = planWeekAdvanced([complete(1), complete(2), main(1)], configFor('complete_meal', 3));
    expect(completeCountPerDay(plan)).toEqual([1, 1, 0]);
    expect(plan.wed).toEqual([null]);
  });

  it('holds across many random plans in every composition', () => {
    const pool = [complete(1), complete(2), complete(3), complete(4), complete(5), complete(6), main(1), main(2), veg(1), veg(2), veg(3)];
    for (const mode of Object.keys(COMPOSITION_CONFIG) as Array<keyof typeof COMPOSITION_CONFIG>) {
      for (let run = 0; run < 40; run++) {
        const plan = planWeekAdvanced(pool, configFor(mode, 7, { allowCompleteMeal: true }));
        expect(Math.max(...completeCountPerDay(plan)), `${mode} run ${run}`).toBeLessThanOrEqual(1);
        for (const day of Object.values(plan)) {
          day.forEach((r, i) => { if (r) expect(matchesSlotRole(r, COMPOSITION_CONFIG[mode].slotRoles[i])).toBe(true); });
        }
      }
    }
  });
});

describe('locked recipes and the daily limit', () => {
  const twoMeat = (lockedSlots: Record<string, boolean>, lockedRecipes: Record<string, unknown>, pool: unknown[]) =>
    planWeekAdvanced(pool as never, configFor('two_meat_one_veg', 1, { allowCompleteMeal: true, lockedSlots, lockedRecipes }));

  it('keeps a compatible locked complete meal', () => {
    const plan = twoMeat({ 'mon-0': true }, { 'mon-0': complete(1) }, [complete(1), complete(2), main(1), veg(1)]);
    expect(plan.mon[0]?.id).toBe('complete-1');
    expect(completeCountPerDay(plan)).toEqual([1]);
  });

  it('a lock in a later slot stops an earlier slot from taking a complete meal', () => {
    const plan = twoMeat({ 'mon-1': true }, { 'mon-1': complete(1) }, [complete(1), complete(2), complete(3), main(1), veg(1)]);
    expect(plan.mon.map(r => r?.id)).toEqual(['main-1', 'complete-1', 'veg-1']);
  });

  it('two locked complete meals on one day: the first is kept, the second released and reported', () => {
    const lockedSlots = { 'mon-0': true, 'mon-1': true };
    const lockedRecipes = { 'mon-0': complete(1), 'mon-1': complete(2) };
    const plan = twoMeat(lockedSlots, lockedRecipes, [complete(1), complete(2), main(1), veg(1)]);
    expect(plan.mon.map(r => r?.id)).toEqual(['complete-1', 'main-1', 'veg-1']);
    const summary = summarizeGeneratedPlan(plan, COMPOSITION_CONFIG.two_meat_one_veg.slotRoles, lockedSlots, lockedRecipes);
    expect(summary.droppedLockKeys).toEqual(['mon-1']);
    expect(buildGenerateFeedback(summary)).toBe('1 道已鎖定的菜式不符合目前餐式，已解除鎖定並重新安排。');
  });

  it('a released second lock with no other protein main leaves that slot empty', () => {
    const plan = twoMeat({ 'mon-0': true, 'mon-1': true }, { 'mon-0': complete(1), 'mon-1': complete(2) }, [complete(1), complete(2), veg(1)]);
    expect(plan.mon.map(r => r?.id ?? null)).toEqual(['complete-1', null, 'veg-1']);
  });

  it('locks on other days do not count toward this day', () => {
    const plan = planWeekAdvanced([complete(1), complete(2), complete(3), veg(1), veg(2)], configFor('meat_veg', 2, {
      allowCompleteMeal: true, lockedSlots: { 'mon-0': true, 'tue-0': true }, lockedRecipes: { 'mon-0': complete(1), 'tue-0': complete(2) },
    }));
    expect(plan.mon[0]?.id).toBe('complete-1');
    expect(plan.tue[0]?.id).toBe('complete-2');
  });

  it('a lock on a day outside the plan still reserves its recipe', () => {
    const plan = planWeekAdvanced([complete(1), complete(2)], configFor('complete_meal', 1, {
      lockedSlots: { 'sun-0': true }, lockedRecipes: { 'sun-0': complete(1) },
    }));
    expect(plan.mon[0]?.id).toBe('complete-2');
  });
});

describe('perfect pantry match and the daily limit', () => {
  it('a complete-meal perfect match is not placed in a day that already has a locked complete meal', () => {
    const pantryComplete = { ...complete(2), canonical_ingredients: ['tofu'] };
    const plan = planWeekAdvanced([complete(1), pantryComplete, main(1), veg(1)] as never, configFor('two_meat_one_veg', 1, {
      allowCompleteMeal: true, pantryIngredients: ['tofu'],
      lockedSlots: { 'mon-1': true }, lockedRecipes: { 'mon-1': complete(1) },
    }));
    expect(plan.mon.map(r => r?.id)).toEqual(['main-1', 'complete-1', 'veg-1']);
  });
});

describe('replace and add-random respect the daily limit', () => {
  it('replace never adds a second complete meal to the day', () => {
    for (let i = 0; i < 20; i++) {
      expect(replaceRecipeInPlan({ mon: [complete(1), main(1), veg(1)] }, 'mon', 1, [complete(2), complete(3), main(1)], {
        dailyComposition: 'two_meat_one_veg',
      })).toBeNull();
    }
    const result = replaceRecipeInPlan({ mon: [complete(1), main(1), veg(1)] }, 'mon', 1, [complete(2), main(2)], {
      dailyComposition: 'two_meat_one_veg',
    });
    expect(result?.mon.map(r => r?.id)).toEqual(['complete-1', 'main-2', 'veg-1']);
  });

  it('replace may swap the day\'s only complete meal for another', () => {
    const result = replaceRecipeInPlan({ mon: [complete(1), main(1), veg(1)] }, 'mon', 0, [complete(1), complete(2)], {
      dailyComposition: 'two_meat_one_veg',
    });
    expect(result?.mon[0]?.id).toBe('complete-2');
  });

  it('replace in complete_meal mode is unaffected', () => {
    const result = replaceRecipeInPlan({ mon: [complete(1)], tue: [complete(2)] }, 'mon', 0, [complete(1), complete(2), complete(3)], {
      dailyComposition: 'complete_meal',
    });
    expect(result?.mon[0]?.id).toBe('complete-3');
  });

  it('add-random offers no complete meal for a day that already has one', () => {
    const plan = { mon: [complete(1), null, veg(1)] };
    expect(getCandidatesForAddRandom([complete(2), main(1)], plan, 'mon', 'protein_main', { index: 1, composition: 'two_meat_one_veg' }))
      .toEqual([main(1)]);
    expect(getCandidatesForAddRandom([complete(2)], plan, 'mon', 'protein_main', { index: 1, composition: 'two_meat_one_veg' }))
      .toEqual([]);
  });

  it('add-random ignores recipes hidden beyond the current composition', () => {
    // generated as two_meat_one_veg, now meat_veg: slot 2 is hidden
    const plan = { mon: [null, veg(1), complete(1)] };
    expect(getCandidatesForAddRandom([complete(2)], plan, 'mon', 'protein_main', { index: 0, composition: 'meat_veg' }))
      .toEqual([complete(2)]);
  });
});
