import { afterEach, describe, expect, it, vi } from 'vitest';
import { planWeekAdvanced, matchesSlotRole, calculatePlanScore } from '@/lib/mealPlanner';
import { allowsCrossRoleFallback } from '@/lib/slotRoles';
import { matchesSlotRole as featureMatchesSlotRole } from '@/features/generate/utils/slotRoleFilter';
import { replaceRecipeInPlan } from '@/features/generate/engine/recipeReplacer';
import { getCandidatesForAddRandom } from '@/features/generate/hooks/useGenerateHandlers';
import { normalizePlanForSave } from '@/features/generate/mappers/normalizePlanForSave';

const recipe = (id: string, meal_role: string, dish_type: string, primary_protein: string | null, extra: object = {}) => ({
  id, name: id, meal_role, dish_type, primary_protein: primary_protein ?? undefined,
  is_complete_meal: meal_role === 'complete_meal', method: id, cuisine: 'chinese', ...extra,
});

const ordinaryMain = recipe('main-fish', 'protein_main', 'main', 'fish');
const ordinaryMain2 = recipe('main-pork', 'protein_main', 'main', 'pork');
const completeA = recipe('complete-a', 'complete_meal', 'main', 'chicken');
const completeB = recipe('complete-b', 'complete_meal', 'main', 'beef');
const vegA = recipe('veg-a', 'veg_side', 'side', null);
const vegB = recipe('veg-b', 'veg_side', 'side', null);
const soup = recipe('soup-egg', 'soup', 'soup', 'egg');
const proteinSide = recipe('side-chicken', 'protein_side', 'side', 'chicken');

const completeConfig = {
  daysPerWeek: 1, dishesPerDay: 1, slotRoles: ['complete_meal'],
  dailyComposition: 'complete_meal', isWeekend: () => false,
};
const meatVegConfig = {
  daysPerWeek: 1, dishesPerDay: 2, slotRoles: ['protein_main', 'veg_side'],
  dailyComposition: 'meat_veg', isWeekend: () => false,
};
const twoMeatConfig = {
  daysPerWeek: 1, dishesPerDay: 3, slotRoles: ['protein_main', 'protein_main', 'veg_side'],
  dailyComposition: 'two_meat_one_veg', isWeekend: () => false,
};

afterEach(() => vi.restoreAllMocks());

describe('slot role validation has one implementation', () => {
  it('the generate feature uses the planner validator', () => {
    expect(featureMatchesSlotRole).toBe(matchesSlotRole);
  });

  it('protein-main slots reject soups and veg sides, veg-side slots reject protein dishes', () => {
    expect(matchesSlotRole(soup, 'protein_main')).toBe(false);
    expect(matchesSlotRole(vegA, 'protein_main')).toBe(false);
    expect(matchesSlotRole(ordinaryMain, 'veg_side')).toBe(false);
    expect(matchesSlotRole(proteinSide, 'veg_side')).toBe(false);
    expect(matchesSlotRole(null, 'any')).toBe(false);
  });

  it('only complete meals fill complete-meal slots', () => {
    expect(matchesSlotRole(completeA, 'complete_meal')).toBe(true);
    expect(matchesSlotRole(ordinaryMain, 'complete_meal')).toBe(false);
    expect(matchesSlotRole(recipe('flag-only', '', 'main', 'pork', { is_complete_meal: true }), 'complete_meal')).toBe(true);
  });

  it('composition roles never fall back across roles; legacy roles still may', () => {
    expect(allowsCrossRoleFallback('complete_meal')).toBe(false);
    expect(allowsCrossRoleFallback('protein_main')).toBe(false);
    expect(allowsCrossRoleFallback('veg_side')).toBe(false);
    expect(allowsCrossRoleFallback('any')).toBe(true);
  });
});

describe('initial generate / regenerate', () => {
  it('selects an eligible complete meal when one is available', () => {
    expect(planWeekAdvanced([ordinaryMain, completeA], completeConfig).mon[0]?.id).toBe('complete-a');
  });

  it('leaves a complete-meal slot empty when no complete meal is available', () => {
    expect(planWeekAdvanced([ordinaryMain, vegA, soup], completeConfig).mon).toEqual([null]);
  });

  it('never fills a complete-meal day with an ordinary main once complete meals run out', () => {
    const plan = planWeekAdvanced([completeA, ordinaryMain, ordinaryMain2], { ...completeConfig, daysPerWeek: 3 });
    const filled = Object.values(plan).flat().filter(Boolean);
    expect(filled.map(r => r?.id)).toEqual(['complete-a']);
    expect(Object.values(plan).map(day => day.length)).toEqual([1, 1, 1]);
  });

  it('fills meat + veg with one protein main and one veg side', () => {
    const plan = planWeekAdvanced([ordinaryMain, vegA, soup, completeA], { ...meatVegConfig, allowCompleteMeal: false });
    expect(plan.mon.map(r => r?.id)).toEqual(['main-fish', 'veg-a']);
  });

  it('fills two meat + one veg with two protein mains and one veg side', () => {
    const plan = planWeekAdvanced([ordinaryMain, ordinaryMain2, vegA, soup], twoMeatConfig);
    expect(matchesSlotRole(plan.mon[0], 'protein_main')).toBe(true);
    expect(matchesSlotRole(plan.mon[1], 'protein_main')).toBe(true);
    expect(plan.mon[2]?.id).toBe('veg-a');
  });

  it('keeps a veg-side slot empty instead of filling it with a protein dish', () => {
    const plan = planWeekAdvanced([ordinaryMain, ordinaryMain2, proteinSide], meatVegConfig);
    expect(plan.mon).toHaveLength(2);
    expect(matchesSlotRole(plan.mon[0], 'protein_main')).toBe(true);
    expect(plan.mon[1]).toBeNull();
  });

  it('preserves slot indices: an empty protein slot does not shift the veg side forward', () => {
    const plan = planWeekAdvanced([vegA, soup], meatVegConfig);
    expect(plan.mon).toEqual([null, expect.objectContaining({ id: 'veg-a' })]);
  });

  it('scores plans with empty slots without throwing', () => {
    expect(calculatePlanScore({ mon: [null, { ...vegA, score: 7 }] })).toBe(7);
  });
});

describe('locked recipes', () => {
  it('rejects an ordinary main locked into a complete-meal slot', () => {
    const plan = planWeekAdvanced([ordinaryMain], {
      ...completeConfig, lockedSlots: { 'mon-0': true }, lockedRecipes: { 'mon-0': ordinaryMain },
    });
    expect(plan.mon).toEqual([null]);
  });

  it('does not reserve a rejected lock, so it can still fill a slot it fits', () => {
    // veg-a locked into the protein slot (e.g. after a composition change)
    const plan = planWeekAdvanced([ordinaryMain, vegA], {
      ...meatVegConfig, lockedSlots: { 'mon-0': true }, lockedRecipes: { 'mon-0': vegA },
    });
    expect(plan.mon.map(r => r?.id)).toEqual(['main-fish', 'veg-a']);
  });

  it('keeps a valid locked recipe and does not reuse it on another day', () => {
    const plan = planWeekAdvanced([completeA, completeB], {
      ...completeConfig, daysPerWeek: 2,
      lockedSlots: { 'mon-0': true }, lockedRecipes: { 'mon-0': completeB },
    });
    expect(plan.mon[0]?.id).toBe('complete-b');
    expect(plan.tue[0]?.id).toBe('complete-a');
  });

  it('ignores a locked recipe whose slot is unlocked', () => {
    const plan = planWeekAdvanced([completeA, completeB], {
      ...completeConfig, daysPerWeek: 2,
      lockedSlots: { 'mon-0': false }, lockedRecipes: { 'mon-0': completeB },
    });
    expect(new Set([plan.mon[0]?.id, plan.tue[0]?.id])).toEqual(new Set(['complete-a', 'complete-b']));
  });
});

describe('perfect pantry match', () => {
  const pantryOnly = (r: ReturnType<typeof recipe>, tag: string) => ({ ...r, canonical_ingredients: [tag] });

  it('does not place a non-complete perfect match in a complete-meal slot', () => {
    const plan = planWeekAdvanced([pantryOnly(ordinaryMain, 'tofu')], { ...completeConfig, pantryIngredients: ['tofu'] });
    expect(plan.mon).toEqual([null]);
  });

  it('does not place a complete-meal perfect match when complete meals are disabled', () => {
    const plan = planWeekAdvanced([pantryOnly(completeA, 'tofu'), ordinaryMain, vegA], {
      ...meatVegConfig, allowCompleteMeal: false, pantryIngredients: ['tofu'],
    });
    expect(plan.mon.map(r => r?.id)).toEqual(['main-fish', 'veg-a']);
  });

  it('places a matching perfect match in its slot', () => {
    const plan = planWeekAdvanced([pantryOnly(completeB, 'tofu'), completeA], { ...completeConfig, pantryIngredients: ['tofu'] });
    expect(plan.mon[0]?.id).toBe('complete-b');
  });
});

describe('replace recipe', () => {
  it('does not replace a complete meal with an ordinary main', () => {
    expect(replaceRecipeInPlan({ mon: [completeA] }, 'mon', 0, [completeA, ordinaryMain], {
      dailyComposition: 'complete_meal',
    })).toBeNull();
  });

  it('replaces a complete meal with another complete meal', () => {
    const result = replaceRecipeInPlan({ mon: [completeA] }, 'mon', 0, [completeA, ordinaryMain, completeB], {
      dailyComposition: 'complete_meal',
    });
    expect(result?.mon[0]?.id).toBe('complete-b');
  });

  it('fills an empty complete-meal slot only with a complete meal', () => {
    const result = replaceRecipeInPlan({ mon: [null], tue: [completeA] }, 'mon', 0, [ordinaryMain, completeB], {
      dailyComposition: 'complete_meal',
    });
    expect(result?.mon).toEqual([expect.objectContaining({ id: 'complete-b' })]);
  });

  it('never replaces a veg side with a protein dish or a protein main with a soup', () => {
    for (let i = 0; i < 20; i++) {
      expect(replaceRecipeInPlan({ mon: [ordinaryMain, vegA] }, 'mon', 1, [ordinaryMain2, proteinSide, soup, vegA], {
        dailyComposition: 'meat_veg',
      })).toBeNull();
      expect(replaceRecipeInPlan({ mon: [ordinaryMain, vegA] }, 'mon', 0, [ordinaryMain, vegB, soup], {
        dailyComposition: 'meat_veg',
      })).toBeNull();
    }
  });

  it('prefers a same-role recipe from replacement history over crossing roles', () => {
    const result = replaceRecipeInPlan({ mon: [ordinaryMain, vegA] }, 'mon', 1, [vegA, vegB, ordinaryMain2], {
      dailyComposition: 'meat_veg', excludeRecipeIds: ['veg-b'],
    });
    expect(result?.mon[1]?.id).toBe('veg-b');
  });

  it('keeps other slot indices intact, including empty ones', () => {
    const result = replaceRecipeInPlan({ mon: [null, vegA] }, 'mon', 1, [vegA, vegB], { dailyComposition: 'meat_veg' });
    expect(result?.mon).toEqual([null, expect.objectContaining({ id: 'veg-b' })]);
  });
});

describe('add random recipe', () => {
  it('offers only complete meals for a complete-meal slot, or nothing', () => {
    expect(getCandidatesForAddRandom([ordinaryMain, vegA], { mon: [null] }, 'mon', 'complete_meal')).toEqual([]);
    expect(getCandidatesForAddRandom([ordinaryMain, completeA], { mon: [null] }, 'mon', 'complete_meal'))
      .toEqual([completeA]);
  });

  it('offers only veg sides for a veg-side slot and only protein mains for a protein slot', () => {
    expect(getCandidatesForAddRandom([ordinaryMain, proteinSide, soup], { mon: [ordinaryMain2, null] }, 'mon', 'veg_side'))
      .toEqual([]);
    expect(getCandidatesForAddRandom([vegA, soup, ordinaryMain], { mon: [null, vegB] }, 'mon', 'protein_main'))
      .toEqual([ordinaryMain]);
  });

  it('keeps the legacy any-recipe fallback for untyped slots', () => {
    expect(getCandidatesForAddRandom([soup], { mon: [] }, 'mon', 'unknown_role')).toEqual([soup]);
  });
});

describe('save mapper', () => {
  it('skips empty slots and keeps each saved recipe on its own day', () => {
    const payload = normalizePlanForSave({ mon: [null, vegA], tue: [null], wed: [completeA, undefined] }, 2, 3);
    expect(payload.items).toEqual([
      { day_index: 0, meal_type: 'dinner', recipe_id: 'veg-a', servings: 2 },
      { day_index: 2, meal_type: 'dinner', recipe_id: 'complete-a', servings: 2 },
    ]);
  });
});
