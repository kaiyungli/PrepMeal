// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

// useGeneratePlan imports the feature index, whose services build a Supabase
// client at import time. Nothing here talks to Supabase.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
});
import {
  summarizeGeneratedPlan, buildGenerateFeedback, buildNoCandidateFeedback, FEEDBACK_DURATION_MS,
} from '@/features/generate/utils/planFeedback';
import { getVisiblePlan } from '@/features/generate/utils/visiblePlan';
import { useGeneratePlan } from '@/features/generate/hooks/useGeneratePlan';
import { useGenerateHandlers } from '@/features/generate/hooks/useGenerateHandlers';
import type { GenerateNotify } from '@/features/generate/hooks/useGeneratePlan';

const recipe = (id: string, meal_role: string, dish_type: string, primary_protein?: string) => ({
  id, name: id, meal_role, dish_type, primary_protein, is_complete_meal: meal_role === 'complete_meal', method: id,
});
const MAIN = recipe('main-1', 'protein_main', 'main', 'pork');
const MAIN_2 = recipe('main-2', 'protein_main', 'main', 'beef');
const VEG = recipe('veg-1', 'veg_side', 'side');
const COMPLETE = recipe('complete-1', 'complete_meal', 'main', 'chicken');

afterEach(() => cleanup());

describe('planFeedback messages', () => {
  it('summarizes empty slots by role and dropped locks once per plan', () => {
    const summary = summarizeGeneratedPlan(
      { mon: [null, VEG], tue: [MAIN, null], wed: [null, null] },
      ['protein_main', 'veg_side'],
      { 'mon-0': true, 'tue-0': true, 'sun-0': true, 'wed-1': false },
      { 'mon-0': VEG, 'tue-0': MAIN, 'sun-0': MAIN, 'wed-1': VEG },
    );
    expect(summary).toEqual({
      emptySlotCount: 4,
      emptySlotRoles: ['protein_main', 'veg_side'],
      // tue-0 kept its lock; sun is not part of the plan; wed-1 was not locked
      droppedLockKeys: ['mon-0'],
    });
    expect(buildGenerateFeedback(summary)).toBe(
      '1 道已鎖定的菜式不符合目前餐式，已解除鎖定並重新安排。有 4 個餐位找不到符合條件的主菜、配菜，已留空。可放寬篩選條件或改選其他餐式。',
    );
  });

  it('counts a lock beyond the new composition\'s slots as dropped', () => {
    const summary = summarizeGeneratedPlan({ mon: [COMPLETE] }, ['complete_meal'], { 'mon-1': true }, { 'mon-1': VEG });
    expect(summary.droppedLockKeys).toEqual(['mon-1']);
    expect(buildGenerateFeedback(summary)).toBe('1 道已鎖定的菜式不符合目前餐式，已解除鎖定並重新安排。');
  });

  it('says nothing when every slot is filled and every lock kept', () => {
    expect(buildGenerateFeedback(summarizeGeneratedPlan({ mon: [COMPLETE] }, ['complete_meal'], { 'mon-0': true }, { 'mon-0': COMPLETE })))
      .toBeNull();
  });

  it('names the slot role for a declined replace or add', () => {
    expect(buildNoCandidateFeedback('complete_meal')).toBe('找不到其他符合條件的完整餐。可放寬篩選條件或改選其他餐式。');
    expect(buildNoCandidateFeedback('veg_side')).toContain('配菜');
    expect(buildNoCandidateFeedback('any')).toContain('食譜');
  });
});

describe('visible plan', () => {
  it('keeps only displayed days and slots, with empty slots in place', () => {
    expect(getVisiblePlan({ mon: [null, VEG, MAIN], tue: [MAIN], wed: [VEG], sat: [] }, 2, 2))
      .toEqual({ mon: [null, VEG], tue: [MAIN] });
  });
});

const planOptions = (filteredRecipes: unknown[], dailyComposition: string, notify: GenerateNotify) => ({
  filteredRecipes, dailyComposition, daysPerWeek: 2,
  effectiveDishesPerDay: dailyComposition === 'complete_meal' ? 1 : 2,
  cuisines: [], exclusions: [], cookingConstraints: [], budget: 'normal', pantryIngredients: [], notify,
});

describe('useGeneratePlan feedback', () => {
  it('Generate with no eligible recipe notifies once, however many slots are empty, and keeps slot positions', () => {
    const notify = vi.fn<GenerateNotify>();
    const { result } = renderHook(() => useGeneratePlan(planOptions([MAIN, VEG], 'complete_meal', notify)));
    act(() => result.current.handleGenerate());

    expect(result.current.weeklyPlan).toEqual({ mon: [null], tue: [null] });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      '有 2 個餐位找不到符合條件的完整餐，已留空。可放寬篩選條件或改選其他餐式。', 'info', FEEDBACK_DURATION_MS,
    );
  });

  it('Generate with every slot filled stays quiet', () => {
    const notify = vi.fn<GenerateNotify>();
    const { result } = renderHook(() => useGeneratePlan(planOptions([MAIN, MAIN_2, VEG, recipe('veg-2', 'veg_side', 'side')], 'meat_veg', notify)));
    act(() => result.current.handleGenerate());
    expect(Object.values(result.current.weeklyPlan).flat().every(Boolean)).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });

  it('a lock that no longer fits after a composition change is released and explained', () => {
    const notify = vi.fn<GenerateNotify>();
    let composition = 'meat_veg';
    const { result, rerender } = renderHook(() => useGeneratePlan(planOptions([MAIN, VEG, COMPLETE], composition, notify)));
    act(() => result.current.setWeeklyPlan({ mon: [MAIN, VEG], tue: [] }));
    act(() => result.current.lockSlot('mon', 0));

    composition = 'complete_meal';
    rerender();
    act(() => result.current.handleGenerate());

    expect(result.current.weeklyPlan.mon).toEqual([expect.objectContaining({ id: 'complete-1' })]);
    expect(result.current.lockedSlots['mon-0']).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain('1 道已鎖定的菜式不符合目前餐式');
  });

  it('a valid lock is kept and not reported', () => {
    const notify = vi.fn<GenerateNotify>();
    const { result } = renderHook(() => useGeneratePlan(planOptions([COMPLETE, recipe('complete-2', 'complete_meal', 'main', 'beef')], 'complete_meal', notify)));
    act(() => result.current.setWeeklyPlan({ mon: [COMPLETE], tue: [] }));
    act(() => result.current.lockSlot('mon', 0));
    act(() => result.current.handleGenerate());
    expect(result.current.weeklyPlan.mon[0]?.id).toBe('complete-1');
    expect(result.current.lockedSlots['mon-0']).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });

  it('a lock left on a slot whose recipe was removed does not lock the next recipe placed there', () => {
    const notify = vi.fn<GenerateNotify>();
    const { result } = renderHook(() => useGeneratePlan(planOptions([COMPLETE, recipe('complete-2', 'complete_meal', 'main', 'beef')], 'complete_meal', notify)));
    act(() => result.current.setWeeklyPlan({ mon: [COMPLETE], tue: [] }));
    act(() => result.current.lockSlot('mon', 0));
    act(() => result.current.setWeeklyPlan({ mon: [null], tue: [] })); // removeRecipe
    act(() => result.current.handleGenerate());
    expect(result.current.weeklyPlan.mon[0]).not.toBeNull();
    expect(result.current.lockedSlots['mon-0']).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });

  it('Replace with no eligible recipe keeps the slot and notifies with its role', () => {
    const notify = vi.fn<GenerateNotify>();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useGeneratePlan(planOptions([MAIN, MAIN_2, VEG], 'meat_veg', notify)));
    act(() => result.current.setWeeklyPlan({ mon: [MAIN, VEG] }));
    act(() => result.current.handleReplaceRecipe('mon', 1));

    expect(result.current.weeklyPlan.mon).toEqual([MAIN, VEG]);
    expect(notify).toHaveBeenCalledWith('找不到其他符合條件的配菜。可放寬篩選條件或改選其他餐式。', 'info', FEEDBACK_DURATION_MS);
    warn.mockRestore();
  });
});

describe('useGenerateHandlers feedback', () => {
  const handlerOptions = (filteredRecipes: unknown[], weeklyPlan: Record<string, unknown[]>, notify: GenerateNotify, setWeeklyPlan = vi.fn()) => ({
    weeklyPlan, setWeeklyPlan, filteredRecipes, clearFilters: vi.fn(), actionsClearAll: vi.fn(),
    handleResetPlan: vi.fn(), dailyComposition: 'complete_meal', notify,
  });

  it('Add with no eligible recipe leaves the plan untouched and notifies', () => {
    const notify = vi.fn<GenerateNotify>();
    const setWeeklyPlan = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useGenerateHandlers(handlerOptions([MAIN, VEG], { mon: [null] }, notify, setWeeklyPlan)));
    act(() => result.current.handleAddRandomRecipe('mon', 0));
    expect(setWeeklyPlan).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('找不到其他符合條件的完整餐。可放寬篩選條件或改選其他餐式。', 'info', FEEDBACK_DURATION_MS);
    warn.mockRestore();
  });

  it('Add with an eligible recipe fills only that slot and stays quiet', () => {
    const notify = vi.fn<GenerateNotify>();
    let plan: Record<string, unknown[]> = { mon: [null], tue: [COMPLETE] };
    const setWeeklyPlan = vi.fn((update: (prev: typeof plan) => typeof plan) => { plan = update(plan); });
    const { result } = renderHook(() => useGenerateHandlers(handlerOptions([MAIN, COMPLETE], plan, notify, setWeeklyPlan)));
    act(() => result.current.handleAddRandomRecipe('mon', 0));
    expect(plan.mon).toEqual([expect.objectContaining({ id: 'complete-1' })]);
    expect(plan.tue).toEqual([COMPLETE]);
    expect(notify).not.toHaveBeenCalled();
  });
});
