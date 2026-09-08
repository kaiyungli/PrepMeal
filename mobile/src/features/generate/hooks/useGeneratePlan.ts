/**
 * Generate settings + plan state.
 *
 * Owns the two preview settings (days, composition) and runs the VENDORED
 * planner. Everything else `planWeekAdvanced` accepts is fixed for Slice 4D-B
 * (see `FIXED_CONFIG`): no filters / exclusions / pantry / locks / save.
 *
 * The planner is synchronous and fast (typ. <15 ms, 4D-A), but the run is still
 * deferred with `InteractionManager.runAfterInteractions` so a slow-device tail
 * never blocks the "生成" press animation. Three safety rules:
 *   1. every scheduled run is cancellable and is cancelled on unmount, on a new
 *      run, and on `reset()` — no `setState` after unmount, no leaked task.
 *   2. the transition generating -> generated/empty always fires for the latest
 *      run (a superseded run just no-ops).
 *   3. the settings row renders ABOVE the plan, so changing days or composition
 *      invalidates the plan it no longer matches: cancel the scheduled run,
 *      clear the plan, return to `idle`. A stale plan is never shown under
 *      freshly-changed settings.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { generateWeeklyPlan } from '../engine/generateWeeklyPlan.ts';
import { COMPOSITION_CONFIG } from '../engine/constants/composition.ts';
import { generateSettingsChanged } from '../lib/generateSettings.ts';
import { planHasRecipes, planToSections } from '../lib/planToSections.ts';
import type {
  CompositionMode,
  DaysPerWeek,
  GenerateRecipe,
  PlanDaySection,
  WeeklyPlan,
} from '../types.ts';

export type GeneratePlanStatus = 'idle' | 'generating' | 'generated' | 'empty';

export const DAYS_OPTIONS: readonly DaysPerWeek[] = [3, 5, 7];
export const COMPOSITION_OPTIONS: readonly CompositionMode[] = [
  'complete_meal',
  'meat_veg',
  'two_meat_one_veg',
];

const DEFAULT_DAYS: DaysPerWeek = 7;
const DEFAULT_COMPOSITION: CompositionMode = 'complete_meal';

/** Everything except days + composition is frozen for 4D-B. */
const FIXED_CONFIG = {
  allowCompleteMeal: true,
  cuisines: [] as string[],
  exclusions: [] as string[],
  cookingConstraints: [] as string[],
  budget: 'medium',
  pantryIngredients: [] as string[],
  lockedSlots: {} as Record<string, boolean>,
  lockedRecipes: {} as Record<string, GenerateRecipe>,
} as const;

function isWeekendKey(dayKey: string): boolean {
  return dayKey === 'sat' || dayKey === 'sun';
}

export interface UseGeneratePlanResult {
  days: DaysPerWeek;
  composition: CompositionMode;
  setDays: (days: DaysPerWeek) => void;
  setComposition: (composition: CompositionMode) => void;
  status: GeneratePlanStatus;
  plan: WeeklyPlan | null;
  sections: PlanDaySection[];
  /** Run the planner over `recipes`. Safe to call repeatedly. */
  generate: (recipes: GenerateRecipe[]) => void;
  /** Back to the pre-generate state (cancels any in-flight run). */
  reset: () => void;
}

interface RunHandle {
  cancelled: boolean;
  task: { cancel: () => void } | null;
}

export function useGeneratePlan(): UseGeneratePlanResult {
  const [days, setDaysState] = useState<DaysPerWeek>(DEFAULT_DAYS);
  const [composition, setCompositionState] = useState<CompositionMode>(DEFAULT_COMPOSITION);
  const [status, setStatus] = useState<GeneratePlanStatus>('idle');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);

  const runRef = useRef<RunHandle | null>(null);

  const cancelActiveRun = useCallback(() => {
    if (runRef.current) {
      runRef.current.cancelled = true;
      runRef.current.task?.cancel();
      runRef.current = null;
    }
  }, []);

  /** Cancel any scheduled run, drop the plan, and return to `idle`. */
  const invalidatePlan = useCallback(() => {
    cancelActiveRun();
    setPlan(null);
    setStatus('idle');
  }, [cancelActiveRun]);

  const setDays = useCallback(
    (next: DaysPerWeek) => {
      if (!generateSettingsChanged({ days, composition }, { days: next, composition })) return;
      invalidatePlan();
      setDaysState(next);
    },
    [days, composition, invalidatePlan],
  );

  const setComposition = useCallback(
    (next: CompositionMode) => {
      if (!generateSettingsChanged({ days, composition }, { days, composition: next })) return;
      invalidatePlan();
      setCompositionState(next);
    },
    [days, composition, invalidatePlan],
  );

  const generate = useCallback(
    (recipes: GenerateRecipe[]) => {
      cancelActiveRun();

      const handle: RunHandle = { cancelled: false, task: null };
      runRef.current = handle;
      setStatus('generating');

      const cc = COMPOSITION_CONFIG[composition];
      const config = {
        daysPerWeek: days,
        dishesPerDay: cc.dishesPerDay,
        slotRoles: cc.slotRoles,
        dailyComposition: composition,
        isWeekend: isWeekendKey,
        ...FIXED_CONFIG,
      };

      handle.task = InteractionManager.runAfterInteractions(() => {
        if (handle.cancelled) return;

        let next: WeeklyPlan;
        try {
          next = generateWeeklyPlan(recipes, config) as WeeklyPlan;
        } catch (err) {
          if (handle.cancelled) return;
          if (__DEV__) {
            console.warn(
              '[useGeneratePlan] planner threw:',
              err instanceof Error ? err.message : String(err),
            );
          }
          runRef.current = null;
          setPlan(null);
          setStatus('empty');
          return;
        }

        if (handle.cancelled) return;
        runRef.current = null;
        setPlan(next);
        setStatus(planHasRecipes(next) ? 'generated' : 'empty');
      });
    },
    [cancelActiveRun, composition, days],
  );

  const reset = useCallback(() => {
    invalidatePlan();
  }, [invalidatePlan]);

  useEffect(() => cancelActiveRun, [cancelActiveRun]);

  const sections = plan ? planToSections(plan, days) : [];

  return {
    days,
    composition,
    setDays,
    setComposition,
    status,
    plan,
    sections,
    generate,
    reset,
  };
}
