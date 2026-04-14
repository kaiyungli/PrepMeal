import { useState, useCallback, useEffect } from 'react';
import { getWeekDates } from '@/utils/dateUtils';
import { generateWeeklyPlan, replaceRecipeInPlan } from '../index';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { perfNow, perfLog } from '@/utils/perf';

const DAYS = getWeekDates();

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
  pantryIngredients: string[];
  traceId?: string;
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
    traceId
  } = options;

  // Plan State
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}) as WeeklyPlan
  );
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});

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
      budget: budget || 'medium',
      pantryIngredients,
      lockedSlots,
      lockedRecipes,
      traceId
    });

    // Calculate metrics
    const generatedRecipeCount = Object.values(newPlan).flat().length;
    const generatedDayCount = Object.values(newPlan).filter((arr: any) => arr?.length).length;
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
  }, [filteredRecipes, daysPerWeek, effectiveDishesPerDay, compositionConfig, dailyComposition, cuisines, exclusions, cookingConstraints, budget, pantryIngredients, lockedSlots, weeklyPlan, traceId]);

  // Replace recipe at slot
  const handleReplaceRecipe = useCallback((dayKey: string, index: number) => {
    const updatedPlan = replaceRecipeInPlan(weeklyPlan, dayKey, index, filteredRecipes);
    if (updatedPlan) {
      setWeeklyPlan(updatedPlan);
    }
  }, [weeklyPlan, filteredRecipes]);

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
