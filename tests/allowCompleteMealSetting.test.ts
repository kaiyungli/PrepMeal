// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

// useGeneratePlan imports the feature index, whose services build a Supabase
// client at import time. Nothing here talks to Supabase.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
});

import { planWeekAdvanced, matchesSlotRole } from '@/lib/mealPlanner';
import { fitsCompleteMealSetting } from '@/lib/slotRoles';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { replaceRecipeInPlan } from '@/features/generate/engine/recipeReplacer';
import { getCandidatesForAddRandom, useGenerateHandlers } from '@/features/generate/hooks/useGenerateHandlers';
import { useGeneratePlan, type GenerateNotify } from '@/features/generate/hooks/useGeneratePlan';
import { summarizeGeneratedPlan, buildGenerateFeedback, FEEDBACK_DURATION_MS } from '@/features/generate/utils/planFeedback';

// allowCompleteMeal=false: a mixed composition never uses a complete meal, on
// any path. allowCompleteMeal=true: complete meals stay eligible, one per day.

const recipe = (id: string, meal_role: string, dish_type: string, primary_protein?: string, extra: object = {}) => ({
  id, name: id, meal_role, dish_type, primary_protein,
  is_complete_meal: meal_role === 'complete_meal', method: id, cuisine: 'chinese', ...extra,
});
const COMPLETE_A = recipe('complete-a', 'complete_meal', 'main', 'chicken');
const COMPLETE_B = recipe('complete-b', 'complete_meal', 'main', 'beef');
// Overlapping classification: a protein-main / dish_type main recipe flagged as a complete meal
const FLAGGED = recipe('flagged-main', 'protein_main', 'main', 'pork', { is_complete_meal: true });
const MAIN = recipe('main-1', 'protein_main', 'main', 'fish');
const MAIN_2 = recipe('main-2', 'protein_main', 'main', 'shrimp');
const VEG = recipe('veg-1', 'veg_side', 'side');
const VEG_2 = recipe('veg-2', 'veg_side', 'side');

type Mode = keyof typeof COMPOSITION_CONFIG;
const configFor = (mode: Mode, allowCompleteMeal: boolean | undefined, extra: object = {}) => ({
  daysPerWeek: 1, dishesPerDay: COMPOSITION_CONFIG[mode].dishesPerDay, slotRoles: COMPOSITION_CONFIG[mode].slotRoles,
  dailyComposition: mode, isWeekend: () => false, allowCompleteMeal, ...extra,
});
const isComplete = (r: unknown) => matchesSlotRole(r as never, 'complete_meal');
const ids = (day: Array<{ id: string } | null | undefined>) => day.map(r => r?.id ?? null);

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('fitsCompleteMealSetting', () => {
  it('excludes complete meals in mixed compositions only when the setting is off', () => {
    for (const mode of ['meat_veg', 'two_meat_one_veg']) {
      expect(fitsCompleteMealSetting(COMPLETE_A, mode, false)).toBe(false);
      expect(fitsCompleteMealSetting(COMPLETE_A, mode, true)).toBe(true);
      expect(fitsCompleteMealSetting(COMPLETE_A, mode, undefined)).toBe(true);
      expect(fitsCompleteMealSetting(MAIN, mode, false)).toBe(true);
    }
    expect(fitsCompleteMealSetting(COMPLETE_A, 'complete_meal', false)).toBe(true);
  });

  it('catches a complete meal whatever its meal_role or dish_type', () => {
    expect(matchesSlotRole(FLAGGED, 'protein_main')).toBe(true); // would otherwise fit a protein slot
    expect(fitsCompleteMealSetting(FLAGGED, 'meat_veg', false)).toBe(false);
    expect(fitsCompleteMealSetting(recipe('role-only', 'complete_meal', 'main', 'beef', { is_complete_meal: false }), 'two_meat_one_veg', false)).toBe(false);
  });
});

describe('generate', () => {
  it.each(['meat_veg', 'two_meat_one_veg'] as Mode[])('%s, setting off: no complete meal, even a flagged protein main', (mode) => {
    for (let run = 0; run < 20; run++) {
      const plan = planWeekAdvanced([COMPLETE_A, COMPLETE_B, FLAGGED, MAIN, MAIN_2, VEG], configFor(mode, false, { daysPerWeek: 2 }));
      expect(Object.values(plan).flat().some(isComplete)).toBe(false);
    }
  });

  it.each(['meat_veg', 'two_meat_one_veg'] as Mode[])('%s, setting on: complete meals eligible, at most one per day', (mode) => {
    let sawComplete = false;
    for (let run = 0; run < 30; run++) {
      const plan = planWeekAdvanced([COMPLETE_A, COMPLETE_B, FLAGGED, MAIN, VEG, VEG_2], configFor(mode, true, { daysPerWeek: 2 }));
      for (const day of Object.values(plan)) {
        expect(day.filter(isComplete).length).toBeLessThanOrEqual(1);
        day.forEach((r, i) => { if (r) expect(matchesSlotRole(r, COMPOSITION_CONFIG[mode].slotRoles[i])).toBe(true); });
        if (day.some(isComplete)) sawComplete = true;
      }
    }
    expect(sawComplete).toBe(true);
  });

  it('complete_meal composition is unaffected by the setting', () => {
    const plan = planWeekAdvanced([COMPLETE_A, MAIN], configFor('complete_meal', false));
    expect(ids(plan.mon)).toEqual(['complete-a']);
  });

  it('setting off with only complete meals for protein: slot stays empty, no fallback, existing feedback', () => {
    const plan = planWeekAdvanced([COMPLETE_A, FLAGGED, VEG], configFor('meat_veg', false));
    expect(ids(plan.mon)).toEqual([null, 'veg-1']);
    expect(buildGenerateFeedback(summarizeGeneratedPlan(plan, COMPOSITION_CONFIG.meat_veg.slotRoles, {}, {})))
      .toBe('有 1 個餐位找不到符合條件的主菜，已留空。可放寬篩選條件或改選其他餐式。');
  });

  it('setting off: a complete-meal perfect pantry match is not used', () => {
    const plan = planWeekAdvanced([{ ...COMPLETE_A, canonical_ingredients: ['tofu'] }, MAIN, VEG] as never,
      configFor('meat_veg', false, { pantryIngredients: ['tofu'] }));
    expect(ids(plan.mon)).toEqual(['main-1', 'veg-1']);
  });
});

describe('locked recipes', () => {
  const locked = (r: object) => ({ lockedSlots: { 'mon-0': true }, lockedRecipes: { 'mon-0': r } });

  it.each(['meat_veg', 'two_meat_one_veg'] as Mode[])('%s: a locked complete meal is released when the setting is off', (mode) => {
    const lock = locked(COMPLETE_A);
    const plan = planWeekAdvanced([COMPLETE_A, MAIN, MAIN_2, VEG], configFor(mode, false, lock));
    expect(plan.mon[0]?.id).not.toBe('complete-a');
    expect(plan.mon.some(isComplete)).toBe(false);
    const summary = summarizeGeneratedPlan(plan, COMPOSITION_CONFIG[mode].slotRoles, lock.lockedSlots, lock.lockedRecipes);
    expect(summary.droppedLockKeys).toEqual(['mon-0']);
  });

  it('a released complete-meal lock with no ordinary main leaves the slot empty', () => {
    const plan = planWeekAdvanced([COMPLETE_A, VEG], configFor('meat_veg', false, locked(COMPLETE_A)));
    expect(ids(plan.mon)).toEqual([null, 'veg-1']);
  });

  it('a locked flagged protein main is released too', () => {
    const plan = planWeekAdvanced([FLAGGED, MAIN, VEG], configFor('meat_veg', false, locked(FLAGGED)));
    expect(ids(plan.mon)).toEqual(['main-1', 'veg-1']);
  });

  it('valid locks are kept: an ordinary main with the setting off, a complete meal with it on or in complete_meal mode', () => {
    expect(planWeekAdvanced([MAIN, MAIN_2, VEG], configFor('meat_veg', false, locked(MAIN))).mon[0]?.id).toBe('main-1');
    expect(planWeekAdvanced([COMPLETE_A, MAIN, VEG], configFor('meat_veg', true, locked(COMPLETE_A))).mon[0]?.id).toBe('complete-a');
    expect(planWeekAdvanced([COMPLETE_A, COMPLETE_B], configFor('complete_meal', false, locked(COMPLETE_A))).mon[0]?.id).toBe('complete-a');
  });
});

describe('replace', () => {
  it('setting off: never inserts a complete meal; with none else eligible it declines', () => {
    for (let i = 0; i < 20; i++) {
      expect(replaceRecipeInPlan({ mon: [MAIN, VEG] }, 'mon', 0, [MAIN, COMPLETE_A, FLAGGED], {
        dailyComposition: 'meat_veg', allowCompleteMeal: false,
      })).toBeNull();
    }
    const result = replaceRecipeInPlan({ mon: [MAIN, VEG] }, 'mon', 0, [MAIN, COMPLETE_A, FLAGGED, MAIN_2], {
      dailyComposition: 'meat_veg', allowCompleteMeal: false,
    });
    expect(ids(result!.mon)).toEqual(['main-2', 'veg-1']);
  });

  it('setting off: a displayed complete meal can be replaced by an ordinary main', () => {
    const result = replaceRecipeInPlan({ mon: [COMPLETE_A, VEG] }, 'mon', 0, [COMPLETE_A, COMPLETE_B, MAIN], {
      dailyComposition: 'meat_veg', allowCompleteMeal: false,
    });
    expect(ids(result!.mon)).toEqual(['main-1', 'veg-1']);
  });

  it('setting on: may insert a complete meal; complete_meal mode ignores the setting', () => {
    const on = replaceRecipeInPlan({ mon: [MAIN, VEG] }, 'mon', 0, [MAIN, COMPLETE_A], { dailyComposition: 'meat_veg', allowCompleteMeal: true });
    expect(on?.mon[0]?.id).toBe('complete-a');
    const completeMode = replaceRecipeInPlan({ mon: [COMPLETE_A] }, 'mon', 0, [COMPLETE_A, COMPLETE_B], { dailyComposition: 'complete_meal', allowCompleteMeal: false });
    expect(completeMode?.mon[0]?.id).toBe('complete-b');
  });
});

describe('add random', () => {
  const slot = (allowCompleteMeal: boolean) => ({ index: 0, composition: 'two_meat_one_veg', allowCompleteMeal });

  it('setting off offers no complete meal; setting on offers one while the day has none', () => {
    const plan = { mon: [null, MAIN, VEG] };
    expect(getCandidatesForAddRandom([COMPLETE_A, FLAGGED, MAIN_2], plan, 'mon', 'protein_main', slot(false))).toEqual([MAIN_2]);
    expect(getCandidatesForAddRandom([COMPLETE_A, FLAGGED], plan, 'mon', 'protein_main', slot(false))).toEqual([]);
    expect(getCandidatesForAddRandom([COMPLETE_A, MAIN_2], plan, 'mon', 'protein_main', slot(true))).toEqual([COMPLETE_A, MAIN_2]);
  });
});

describe('hooks: setting reaches Replace and Add; failures keep the plan', () => {
  const planOptions = (allowCompleteMeal: boolean, filteredRecipes: unknown[], notify: GenerateNotify) => ({
    filteredRecipes, dailyComposition: 'meat_veg', daysPerWeek: 1, effectiveDishesPerDay: 2,
    cuisines: [], exclusions: [], cookingConstraints: [], budget: 'normal', pantryIngredients: [], allowCompleteMeal, notify,
  });

  it('Replace with the setting off and only complete meals left keeps the original recipe and notifies', () => {
    const notify = vi.fn<GenerateNotify>();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useGeneratePlan(planOptions(false, [MAIN, COMPLETE_A, FLAGGED, VEG], notify)));
    act(() => result.current.setWeeklyPlan({ mon: [MAIN, VEG] }));
    act(() => result.current.handleReplaceRecipe('mon', 0));
    expect(result.current.weeklyPlan.mon).toEqual([MAIN, VEG]);
    expect(notify).toHaveBeenCalledWith('找不到其他符合條件的主菜。可放寬篩選條件或改選其他餐式。', 'info', FEEDBACK_DURATION_MS);
  });

  it('Add with the setting off and only complete meals leaves the slot empty and notifies', () => {
    const notify = vi.fn<GenerateNotify>();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setWeeklyPlan = vi.fn();
    const { result } = renderHook(() => useGenerateHandlers({
      weeklyPlan: { mon: [null, VEG] }, setWeeklyPlan, filteredRecipes: [COMPLETE_A, FLAGGED, VEG],
      clearFilters: vi.fn(), actionsClearAll: vi.fn(), handleResetPlan: vi.fn(),
      dailyComposition: 'meat_veg', allowCompleteMeal: false, notify,
    }));
    act(() => result.current.handleAddRandomRecipe('mon', 0));
    expect(setWeeklyPlan).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('找不到其他符合條件的主菜。可放寬篩選條件或改選其他餐式。', 'info', FEEDBACK_DURATION_MS);
  });

  it('toggling the setting does not change the displayed plan; the next Generate applies it', () => {
    const notify = vi.fn<GenerateNotify>();
    let allow = true;
    const { result, rerender } = renderHook(() => useGeneratePlan(planOptions(allow, [COMPLETE_A, MAIN, VEG], notify)));
    act(() => result.current.setWeeklyPlan({ mon: [COMPLETE_A, VEG] }));
    const displayed = result.current.weeklyPlan;
    allow = false;
    rerender();
    expect(result.current.weeklyPlan).toBe(displayed);
    act(() => result.current.handleGenerate());
    expect(result.current.weeklyPlan.mon.some(isComplete)).toBe(false);
  });

  it('a locked complete meal is released on Generate after the setting is turned off, with the existing feedback', () => {
    const notify = vi.fn<GenerateNotify>();
    let allow = true;
    const { result, rerender } = renderHook(() => useGeneratePlan(planOptions(allow, [COMPLETE_A, MAIN, VEG], notify)));
    act(() => result.current.setWeeklyPlan({ mon: [COMPLETE_A, VEG] }));
    act(() => result.current.lockSlot('mon', 0));
    allow = false;
    rerender();
    act(() => result.current.handleGenerate());
    expect(ids(result.current.weeklyPlan.mon)).toEqual(['main-1', 'veg-1']);
    expect(result.current.lockedSlots['mon-0']).toBe(false);
    expect(notify).toHaveBeenCalledWith('1 道已鎖定的菜式不符合目前餐式，已解除鎖定並重新安排。', 'info', FEEDBACK_DURATION_MS);
  });
});
