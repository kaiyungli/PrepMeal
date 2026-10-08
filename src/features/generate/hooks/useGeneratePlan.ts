import { useState, useCallback } from 'react';
import { getWeekDates } from '@/utils/dateUtils';
import { generateWeeklyPlan, replaceRecipeInPlan } from '../index';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { perfNow, perfLog } from '@/utils/perf';
import { getSlotRoleForIndex } from '../utils/slotRoleFilter';
import { summarizeGeneratedPlan, buildGenerateFeedback, buildNoCandidateFeedback, FEEDBACK_DURATION_MS } from '../utils/planFeedback';

// Shows a user-visible message (the page's toast).
export type GenerateNotify = (message: string, type?: 'info' | 'success' | 'error', duration?: number) => void;

const DAYS = getWeekDates();

// Empty slots are null so each recipe keeps its slot index.
interface WeeklyPlan {
  [dayKey: string]: any[];
}

interface UseGeneratePlanOptions {
  filteredRecipes: any[];
  dailyComposition?: string;
  daysPerWeek: number;
  effectiveDishesPerDay: number;
  cuisines: string[];
  exclusions: string[];
  cookingConstraints: any;
  budget: string;
  allowCompleteMeal?: boolean;
  pantryIngredients: string[];
  traceId?: string;
  notify?: GenerateNotify;
}

export function useGeneratePlan(options: UseGeneratePlanOptions) {
  const { 
    filteredRecipes,
    dailyComposition,
    daysPerWeek,
    effectiveDishesPerDay,
    cuisines,
    exclusions,
    cookingConstraints,
    budget,
    pantryIngredients,
    allowCompleteMeal,
    traceId,
    notify,
  } = options;

  // Plan State
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}) as WeeklyPlan
  );
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});
  const [replacementHistory, setReplacementHistory] = useState<Record<string, string[]>>({});

  const compositionKey = dailyComposition || 'meat_veg';
  const compositionConfig = COMPOSITION_CONFIG[compositionKey as keyof typeof COMPOSITION_CONFIG] || COMPOSITION_CONFIG.meat_veg;

  // Log planner start before generation
  const handleGenerate = useCallback(() => {
    const start = perfNow();
    
    // Log start
    perfLog({
      traceId,
      event: 'generate_click',
      stage: 'planner_start',
      label: 'generate.planner.start',
      duration: 0,
      meta: {
        filteredRecipeCount: filteredRecipes.length,
        daysPerWeek,
        dishesPerDay: effectiveDishesPerDay,
        compositionKey
      }
    });
    
    // Collect locked recipes
    const lockedRecipes: Record<string, any> = {};
    Object.entries(lockedSlots).forEach(([key, isLocked]) => {
      if (isLocked) {
        const [dayKey, indexStr] = key.split('-');
        const index = parseInt(indexStr);
        if (weeklyPlan[dayKey]?.[index]) {
          lockedRecipes[key] = weeklyPlan[dayKey][index];
        }
      }
    });

    // Run planner
    const newPlan = generateWeeklyPlan(filteredRecipes, {
      daysPerWeek,
      dishesPerDay: effectiveDishesPerDay,
      slotRoles: compositionConfig.slotRoles,
      dailyComposition: dailyComposition as string,
      isWeekend: (dayKey: string) => DAYS.find(d => d.key === dayKey)?.isWeekend || false,
      cuisines,
      exclusions,
      cookingConstraints,
      budget: budget || 'normal',
      allowCompleteMeal: allowCompleteMeal,
      pantryIngredients,
      lockedSlots,
      lockedRecipes,
      traceId
    });

    // Calculate metrics
    const generatedRecipeCount = Object.values(newPlan).flat().filter(Boolean).length;
    const generatedDayCount = Object.values(newPlan).filter((arr: any) => arr?.some(Boolean)).length;
    const lockedSlotCount = Object.values(lockedSlots).filter(Boolean).length;
    
    const end = perfNow();
    
    // Log done
    perfLog({
      traceId,
      event: 'generate_click',
      stage: 'planner_done',
      label: 'generate.planner.done',
      start,
      end,
      meta: {
        filteredRecipeCount: filteredRecipes.length,
        generatedDayCount,
        generatedRecipeCount,
        lockedSlotCount
      }
    });

    setWeeklyPlan(newPlan);
    setReplacementHistory({});

    // Explain empty slots and dropped locks once per Generate, not per slot.
    const summary = summarizeGeneratedPlan(newPlan, compositionConfig.slotRoles, lockedSlots, lockedRecipes);
    // A lock whose recipe was dropped, or whose slot was already empty (recipe
    // removed while locked), would now pin a recipe the user never chose.
    const releasedLockKeys = [
      ...summary.droppedLockKeys,
      ...Object.keys(lockedSlots).filter(key => lockedSlots[key] && !lockedRecipes[key]),
    ];
    if (releasedLockKeys.length > 0) {
      setLockedSlots(prev => {
        const next = { ...prev };
        releasedLockKeys.forEach(key => { next[key] = false; });
        return next;
      });
    }
    const feedback = buildGenerateFeedback(summary);
    if (feedback) notify?.(feedback, 'info', FEEDBACK_DURATION_MS);
  }, [filteredRecipes, daysPerWeek, effectiveDishesPerDay, compositionConfig, dailyComposition, cuisines, exclusions, cookingConstraints, budget, pantryIngredients, lockedSlots, weeklyPlan, traceId, allowCompleteMeal, compositionKey, notify]);

  // Replace recipe at slot
  const handleReplaceRecipe = useCallback((dayKey: string, index: number) => {
    const slotKey = `${dayKey}-${index}`;
    const historyIds = replacementHistory[slotKey] || [];
    const options = { dailyComposition, budget, excludeRecipeIds: historyIds };
    const updatedPlan = replaceRecipeInPlan(weeklyPlan, dayKey, index, filteredRecipes, options);
    if (updatedPlan) {
      const newRecipe = updatedPlan[dayKey]?.[index];
      setWeeklyPlan(updatedPlan);
      // Track replacement history
      if (newRecipe?.id) {
        setReplacementHistory(prev => ({
          ...prev,
          [slotKey]: [...(prev[slotKey] || []), newRecipe.id].slice(-20),
        }));
      }
    } else {
      notify?.(buildNoCandidateFeedback(getSlotRoleForIndex(compositionKey, index)), 'info', FEEDBACK_DURATION_MS);
    }
  }, [weeklyPlan, filteredRecipes, dailyComposition, budget, replacementHistory, compositionKey, notify]);

  // Lock/unlock slots
  const lockSlot = useCallback((dayKey: string, index: number) => {
    const key = `${dayKey}-${index}`;
    setLockedSlots(prev => ({ ...prev, [key]: true }));
  }, []);

  const unlockSlot = useCallback((dayKey: string, index: number) => {
    const key = `${dayKey}-${index}`;
    setLockedSlots(prev => ({ ...prev, [key]: false }));
  }, []);

  // Reset plan
  const handleResetPlan = useCallback(() => {
    setWeeklyPlan({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    setLockedSlots({});
  }, []);

  return {
    weeklyPlan,
    lockedSlots,
    lockSlot,
    unlockSlot,
    handleGenerate,
    handleReplaceRecipe,
    handleResetPlan,
    setWeeklyPlan,
    setLockedSlots,
  };
}
