import { useState, useCallback } from 'react';
import { getWeekDates } from '@/utils/dateUtils';
import { generateWeeklyPlan } from '../index';
import { COMPOSITION_CONFIG } from '@/constants/composition';

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
  } = options;

  // Plan State
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}) as WeeklyPlan
  );
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});

  const compositionKey = dailyComposition || 'meat_veg';
  const compositionConfig = COMPOSITION_CONFIG[compositionKey as keyof typeof COMPOSITION_CONFIG] || COMPOSITION_CONFIG.meat_veg;

  // Handle generate
  const handleGenerate = useCallback(() => {
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
      lockedRecipes
    });

    setWeeklyPlan(newPlan);
  }, [filteredRecipes, daysPerWeek, effectiveDishesPerDay, compositionConfig, dailyComposition, cuisines, exclusions, cookingConstraints, budget, pantryIngredients, lockedSlots, weeklyPlan]);

  // Replace recipe at slot
  const handleReplaceRecipe = useCallback((dayKey: string, index: number) => {
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id));
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      setWeeklyPlan(prev => ({
        ...prev,
        [dayKey]: (prev[dayKey] || []).map((r, i) => i === index ? random : r)
      }));
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

  return {
    weeklyPlan,
    setWeeklyPlan,
    lockedSlots,
    setLockedSlots,
    lockSlot,
    unlockSlot,
    handleGenerate,
    handleReplaceRecipe,
  };
}