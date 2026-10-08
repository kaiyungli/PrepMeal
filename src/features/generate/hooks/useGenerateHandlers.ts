import { useCallback } from 'react';
import { getSlotRoleForIndex, matchesSlotRole, allowsCrossRoleFallback, fitsDailyCompleteMealLimit, fitsCompleteMealSetting, getOtherSlotsInDay } from '../utils/slotRoleFilter';
import { matchesBudgetPreference, preferBudgetRecipes } from '../engine/budgetPreference';
import { buildNoCandidateFeedback, FEEDBACK_DURATION_MS } from '../utils/planFeedback';
import type { GenerateNotify } from './useGeneratePlan';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function getRecentRecipesForDiversity(weeklyPlan: Record<string, any[]>, dayKey: string): any[] {
  const currentIdx = DAY_ORDER.indexOf(dayKey);
  if (currentIdx <= 0) return [];
  
  const recent: any[] = [];
  for (let i = 1; i <= 2; i++) {
    const prevDay = DAY_ORDER[currentIdx - i];
    if (prevDay && weeklyPlan[prevDay]) {
      recent.push(...weeklyPlan[prevDay].filter(Boolean));
    }
  }
  
  return recent;
}

function hasRecentDuplicate(candidate: any, recent: any[]): boolean {
  if (!recent.length) return false;
  
  const recentProteins = recent.map(r => r.primary_protein).filter(Boolean);
  const recentMethods = recent.map(r => r.method).filter(Boolean);
  
  return (
    (candidate.primary_protein && recentProteins.includes(candidate.primary_protein)) ||
    (candidate.method && recentMethods.includes(candidate.method))
  );
}

function buildSelectionReasons(candidate: any, slotRole: string, recent: any[], budget?: string, weeklyPlan?: Record<string, any[]>): string[] {
  const reasons: string[] = [];
  
  if (slotRole === 'protein_main' && candidate.primary_protein) {
    reasons.push('protein_main');
  } else if (slotRole === 'protein_main' && candidate.dish_type === 'main') {
    reasons.push('protein_main (dish_type)');
  } else if (slotRole === 'veg_side' && !candidate.primary_protein && candidate.dish_type === 'side') {
    reasons.push('veg_side');
  }
  
  if (!hasRecentDuplicate(candidate, recent)) {

  // Budget match
  if (matchesBudgetPreference(candidate, budget)) {
    reasons.push('budget_match');
  }

  // Ingredient reuse
  if (weeklyPlan) {
    const keywords = new Set<string>();
    for (const dayRecipes of Object.values(weeklyPlan)) {
      for (const r of (Array.isArray(dayRecipes) ? dayRecipes : [])) {
        if (r?.name || r?.description) {
          const text = (r.name + ' ' + (r.description || '')).toLowerCase();
          const matches = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
          matches.slice(0, 3).forEach(m => keywords.add(m));
        }
      }
    }
    const candText = ((candidate.name || '') + ' ' + (candidate.description || '')).toLowerCase();
    if ([...keywords].some(k => candText.includes(k))) {
      reasons.push('ingredient_reuse');
    }
  }
    reasons.push('diverse');
  }
  
  return reasons;
}

/**
 * Get candidates for add-random: exact role first, then any unused recipe for
 * slots that allow a cross-role fallback. A complete-meal slot stays empty.
 */
export function getCandidatesForAddRandom(
  filteredRecipes: any[],
  weeklyPlan: Record<string, any[]>,
  dayKey: string,
  slotRole: string,
  // Slot being filled, composition and allowCompleteMeal, for the complete-meal rules
  slot?: { index: number; composition: string; allowCompleteMeal?: boolean }
): any[] {
  // Get recipes already in this day
  const dayRecipes = (weeklyPlan[dayKey] || []).filter(Boolean);
  const dayRecipeIds = new Set(dayRecipes.map((r: any) => r.id));

  // Filter out already-used recipes, a second complete meal for the day and
  // complete meals the allowCompleteMeal setting excludes
  const otherSlotsInDay = slot ? getOtherSlotsInDay(weeklyPlan, dayKey, slot.index, slot.composition) : dayRecipes;
  const unused = filteredRecipes.filter((r: any) => !dayRecipeIds.has(r.id)
    && fitsDailyCompleteMealLimit(r, otherSlotsInDay)
    && (!slot || fitsCompleteMealSetting(r, slot.composition, slot.allowCompleteMeal)));

  // Exact role match first
  const exact = unused.filter((r: any) => matchesSlotRole(r, slotRole));
  if (exact.length > 0) return exact;

  return allowsCrossRoleFallback(slotRole) ? unused : [];
}


interface UseGenerateHandlersOptions {
  budget?: string;
  weeklyPlan: any;
  setWeeklyPlan: (plan: any) => void;
  filteredRecipes: any[];
  clearFilters: () => void;
  actionsClearAll: () => void;
  handleResetPlan: () => void;
  dailyComposition: string;
  allowCompleteMeal?: boolean;
  notify?: GenerateNotify;
}

export function useGenerateHandlers({
  weeklyPlan,
  setWeeklyPlan,
  filteredRecipes,
  clearFilters,
  actionsClearAll,
  handleResetPlan,
  dailyComposition,
  budget,
  allowCompleteMeal,
  notify,
}: UseGenerateHandlersOptions) {
  
// Apply soft budget preference (filter, not block)
// Extract ingredient keywords from existing recipes
function getIngredientKeywords(weeklyPlan: Record<string, any[]>): string[] {
  const allRecipes = Object.values(weeklyPlan).flat().flat().filter(Boolean);
  const keywords: string[] = [];
  
  for (const recipe of allRecipes) {
    const text = ((recipe.name || "") + " " + (recipe.description || "")).toLowerCase();
    const matches = text.match(/[一-龥]{2,4}/g) || [];
    keywords.push(...matches.slice(0, 3));
  }
  
  return [...new Set(keywords)];
}

// Apply ingredient reuse preference (soft bias)
function applyIngredientReusePreference(candidates: any[], weeklyPlan: Record<string, any[]>): any[] {
  const keywords = getIngredientKeywords(weeklyPlan);
  if (keywords.length === 0) return candidates;
  
  const reuseCandidates = candidates.filter(c => {
    const text = ((c.name || "") + " " + (c.description || "")).toLowerCase();
    return keywords.some(k => text.includes(k));
  });
  
  return reuseCandidates.length > 0 ? reuseCandidates : candidates;
}

const handleAddRandomRecipe = useCallback((dayKey: string, slotIndex: number): void => {
    const composition = dailyComposition || 'meat_veg';
    const nextSlotRole = getSlotRoleForIndex(composition, slotIndex);
    
    // Get candidates - exact role first, fallback to any unused
    let candidates = getCandidatesForAddRandom(
      filteredRecipes,
      weeklyPlan,
      dayKey,
      nextSlotRole,
      { index: slotIndex, composition, allowCompleteMeal }
    );
    
    if (candidates.length === 0) {
      console.warn('[generate] add random failed: no candidates', {
        dayKey,
        slotIndex,
        nextSlotRole,
        filteredCount: filteredRecipes.length,
        dayRecipeCount: (weeklyPlan[dayKey] || []).filter(Boolean).length,
      });
      notify?.(buildNoCandidateFeedback(nextSlotRole), 'info', FEEDBACK_DURATION_MS);
      return;
    }
    
    // Diversity filter (BEFORE preferences)
    const recent = getRecentRecipesForDiversity(weeklyPlan, dayKey);
    const diverseCandidates = candidates.filter((r: any) => !hasRecentDuplicate(r, recent));
    candidates = diverseCandidates.length > 0 ? diverseCandidates : candidates;
    
    // Budget preference (after diversity)
    candidates = preferBudgetRecipes(candidates, budget);
    
    // Ingredient reuse preference (last before random)
    candidates = applyIngredientReusePreference(candidates, weeklyPlan);
    
    // Select random
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Attach reasons
    const reasons = buildSelectionReasons(random, nextSlotRole, recent, budget, weeklyPlan);
    const randomWithReasons = { ...random, selectionReasons: reasons };
    
    setWeeklyPlan((prev: Record<string, any[]>) => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes[slotIndex] = randomWithReasons;
      return { ...prev, [dayKey]: dayRecipes };
    });
  }, [weeklyPlan, filteredRecipes, setWeeklyPlan, dailyComposition, budget, allowCompleteMeal, notify]);

  const removeRecipe = useCallback((dayKey: string, index: number): void => {
    setWeeklyPlan((prev: Record<string, any[]>) => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes[index] = null;
      return { ...prev, [dayKey]: dayRecipes };
    });
  }, [setWeeklyPlan]);

  const handleClearAll = useCallback((): void => {
    actionsClearAll();
    handleResetPlan();
    clearFilters();
  }, [actionsClearAll, handleResetPlan, clearFilters]);

  return {
    handleAddRandomRecipe,
    removeRecipe,
    handleClearAll,
  };
}
