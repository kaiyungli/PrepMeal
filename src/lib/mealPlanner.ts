/**
 * Meal Planner - Recipe selection and scoring
 * 
 * Filter values used (should match src/constants/filters.ts):
 * - cuisine: chinese, western, japanese, korean, thai, fusion
 * - dish_type: main, side, staple, soup
 * - method: stir_fry, steamed, fried, boiled, braised, baked
 * - difficulty: easy, medium, hard
 * - protein: chicken, pork, beef, egg, tofu, shrimp, fish, mixed (or primary_protein)
 * - diet: vegetarian, high_protein, low_calorie
 * - flavor: salty, sweet, sour, spicy
 * - speed: quick, normal
 */
import { normalizeIngredients, getRecipeCanonicalIngredients } from './ingredientNormalizer'
import { perfNow, perfMeasure, perfLog } from '@/utils/perf';
import { PLANNER_WEIGHTS, PLANNER_RULES } from '@/constants/planner';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { matchesBudgetPreference, preferBudgetRecipes } from '@/features/generate/engine/budgetPreference';
import { matchesSlotRole, allowsCrossRoleFallback, fitsDailyCompleteMealLimit, fitsCompleteMealSetting } from './slotRoles';

export { matchesSlotRole };

// Helper to build recipe search text (optimization: avoid repeated construction)
function getRecipeSearchText(recipe: Recipe): string {
  return [
    recipe.name,
    recipe.description,
    recipe.cuisine,
    recipe.method,
    recipe.dish_type,
    recipe.primary_protein,
    ...(recipe.ingredients_list || [])
  ].filter(Boolean).join(' ').toLowerCase();
}

// Helper to get canonical Set (optimization: combine getRecipeCanonicalIngredients + new Set)
function getRecipeCanonicalSet(recipe: Recipe): Set<string> {
  const canonical = getRecipeCanonicalIngredients(recipe);
  return new Set(canonical);
}



// Randomness factor for variety (±20% score variation)
const RANDOM_FACTOR = PLANNER_WEIGHTS.RANDOM_FACTOR;

// Helper to apply recipe selection and update state
// Unified state update for locked / perfect match / normal selection
function applyRecipeSelection(
  recipe: Recipe,
  usedRecipeIds: Set<string>,
  recentProteins: string[],
  recentMethods: string[]
) {
  usedRecipeIds.add(recipe.id)
  const protein = recipe.primary_protein || (Array.isArray(recipe.protein) ? recipe.protein[0] : null)
  if (protein) recentProteins.push(protein)
  const method = recipe.method
  if (method) recentMethods.push(method)
}

interface Recipe {
  id: string
  name: string
  method?: string
  difficulty?: string
  speed?: string
  primary_protein?: string
  dish_type?: string
  ingredients_list?: string[]
  budget_level?: string | null
  cuisine?: string
  score?: number
  [key: string]: any
}

// A planned slot holds a recipe, or null when no eligible recipe exists.
// Empty slots keep their index so later recipes never shift into the wrong role.
export type PlanSlot = Recipe | null
export type WeeklyPlanResult = Record<string, PlanSlot[]>

// Use centralized PLANNER_WEIGHTS constants
const WEIGHTS = PLANNER_WEIGHTS;

/**
 * Calculate protein diversity score
 */
function scoreProteinDiversity(
  protein: string | undefined,
  recentProteins: string[]
): { score: number; reason: string } {
  if (!protein) return { score: 0, reason: '' }
  if (recentProteins.length === 0) return { score: WEIGHTS.PROTEIN_NEW, reason: 'protein_new' }
  
  if (recentProteins[0] === protein) {
    return { score: WEIGHTS.PROTEIN_SAME_DAY, reason: 'protein_same_day' }
  }
  
  const recentWindow = recentProteins.slice(0, 2)
  if (recentWindow.includes(protein)) {
    return { score: WEIGHTS.PROTEIN_WITHIN_2_DAYS, reason: 'protein_within_2_days' }
  }
  
  return { score: WEIGHTS.PROTEIN_NEW, reason: 'protein_new' }
}

/**
 * Calculate method diversity score
 */
function scoreMethodDiversity(
  method: string | undefined,
  recentMethods: string[]
): { score: number; reason: string } {
  if (!method) return { score: 0, reason: '' }
  if (recentMethods.length === 0) return { score: WEIGHTS.METHOD_NEW, reason: 'method_new' }
  
  if (recentMethods[0] === method) {
    return { score: WEIGHTS.METHOD_SAME_DAY, reason: 'method_same_day' }
  }
  
  return { score: WEIGHTS.METHOD_NEW, reason: 'method_new' }
}

/**
 * Calculate weekday speed bias
 */
function scoreWeekdaySpeed(speed: string | undefined, isWeekday: boolean): { score: number; reason: string } {
  if (!isWeekday || !speed) return { score: 0, reason: '' }
  
  if (speed === 'quick') return { score: WEIGHTS.SPEED_QUICK, reason: 'weekday_quick' }
  if (speed === 'normal') return { score: WEIGHTS.SPEED_NORMAL, reason: 'weekday_normal' }
  if (speed === 'slow') return { score: WEIGHTS.SPEED_SLOW, reason: 'weekday_slow' }
  
  return { score: 0, reason: '' }
}

/**
 * Calculate difficulty bias
 */
function scoreDifficulty(difficulty: string | undefined): { score: number; reason: string } {
  if (!difficulty) return { score: 0, reason: '' }
  
  if (difficulty === 'easy') return { score: WEIGHTS.DIFFICULTY_EASY, reason: 'easy_difficulty' }
  if (difficulty === 'medium') return { score: WEIGHTS.DIFFICULTY_MEDIUM, reason: 'medium_difficulty' }
  if (difficulty === 'hard') return { score: WEIGHTS.DIFFICULTY_HARD, reason: 'hard_difficulty' }
  
  return { score: 0, reason: '' }
}

/**
 * Select the best recipe for a slot
 */
export function calculatePlanScore(
  plan: WeeklyPlanResult,
  usedProteins: string[] = []
): number {
  let totalScore = 0
  
  Object.values(plan).forEach(dayRecipes => {
    dayRecipes.forEach(recipe => {
      if (recipe) totalScore += recipe.score || WEIGHTS.BASE_SCORE
    })
  })
  
  return totalScore
}

/**
 * Plan the week
 */
export function planWeek(recipes: Recipe[]): Recipe[] {
  const used = new Set()
  const result: Recipe[] = []
  for (const r of recipes) {
    if (!used.has(r.id)) {
      used.add(r.id)
      result.push(r)
    }
    if (result.length === 7) break
  }
  return result
}

/**
 * Advanced planning with full pantry support
 * This combines all features from generate.js inline planner
 */
export interface PlanConfig {
  daysPerWeek: number;
  dishesPerDay: number;
  slotRoles?: string[];
  dailyComposition?: string; // 'complete_meal' | 'meat_veg' | 'two_meat_one_veg'
  allowCompleteMeal?: boolean; // Whether to allow complete_meal in mixed modes
  isWeekend: (dayKey: string) => boolean;
  cuisines?: string[];
  exclusions?: string[];
  cookingConstraints?: string[];
  budget?: string;
  pantryIngredients?: string[];
  lockedSlots?: Record<string, boolean>;
  lockedRecipes?: Record<string, Recipe>;
}

// Candidates for a slot: exact role first. Composition roles stop there and
// leave the slot empty; legacy roles fall back along a chain.
function getCandidatesWithFallback(
  recipes: Recipe[], 
  slotRole: string,
  usedRecipeIds: Set<string>
): Recipe[] {
  const exactMatch = recipes.filter(r => 
    !usedRecipeIds.has(r.id) && matchesSlotRole(r, slotRole)
  );
  if (exactMatch.length > 0 || !allowsCrossRoleFallback(slotRole)) return exactMatch;
  
  // Fallback chain for legacy roles
  const fallbacks: Record<string, string[]> = {
    'soup': ['soup', 'side', 'any'],
  };
  
  const chain = fallbacks[slotRole] || ['any'];
  for (const fallbackRole of chain) {
    const candidates = recipes.filter(r => 
      !usedRecipeIds.has(r.id) && matchesSlotRole(r, fallbackRole)
    );
    if (candidates.length > 0) return candidates;
  }
  
  // Ultimate fallback: any unused recipe
  return recipes.filter(r => !usedRecipeIds.has(r.id));
}


export function planWeekAdvanced(
  recipes: Recipe[],
  config: PlanConfig & { traceId?: string }
): WeeklyPlanResult {
  const traceId = (config as any).traceId;
  const fnStart = perfNow();
  const {
    daysPerWeek,
    dishesPerDay,
    slotRoles,
    isWeekend,
    cuisines = [],
    exclusions = [],
    cookingConstraints = [],
    budget,
    pantryIngredients = [],
    lockedSlots = {},
    lockedRecipes = {}
  } = config;

  // Use slotRoles if provided, otherwise fallback to dishesPerDay filled with 'any'
  const effectiveSlotRoles = (slotRoles && slotRoles.length > 0) 
    ? slotRoles 
    : Array(dishesPerDay).fill('any');

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].slice(0, daysPerWeek);
  const result: WeeklyPlanResult = {};
  const usedRecipeIds = new Set<string>(); // Track used recipes to avoid repeats
  const recentProteins: string[] = [];
  const recentMethods: string[] = [];
  const usedPantryIngredients: string[] = [];

  // Pre-normalize exclusions ONCE before filter loop (optimization)
  const normExclusions = exclusions.length > 0 ? normalizeIngredients(exclusions) : [];
  
  // Filter recipes
  const filterStart = perfNow();
  let filtered = recipes.filter(r => {
    if (cuisines.length > 0 && r.cuisine && !cuisines.includes(r.cuisine)) return false;
    if (normExclusions.length > 0) {
      // Check both primary_protein and protein array
      const proteinValues = [r.primary_protein, ...(r.protein || [])].filter(Boolean);
      const normProtein = normalizeIngredients(proteinValues);
      
      // If any exclusion matches normalized protein, filter out
      if (normProtein.some(p => normExclusions.includes(p))) {
        return false;
      }
    }
    return true;
  });

  // Hard filter: exclude complete_meal in mixed mode when allowCompleteMeal=false.
  // Applied to the pool so every selection path (slot candidates and the
  // perfect pantry match) respects it; locks are checked below.
  const compositionKey = config.dailyComposition || 'meat_veg';
  const compositionConfig = COMPOSITION_CONFIG[compositionKey as keyof typeof COMPOSITION_CONFIG];
  filtered = filtered.filter(r => fitsCompleteMealSetting(r, compositionKey, config.allowCompleteMeal));
  const filterEnd = perfNow();
  if (traceId) {
    perfLog({
      traceId,
      event: 'meal_planner',
      stage: 'filtering',
      label: 'mealPlanner.filtering',
      start: filterStart,
      end: filterEnd,
      meta: {
        inputCount: recipes.length,
        outputCount: filtered.length,
        cuisineCount: cuisines.length,
        exclusionCount: normExclusions.length
      }
    });
  }

  // A locked recipe is kept only while it still fits its slot's role and the
  // allowCompleteMeal setting (for example after a composition or setting
  // change); otherwise the slot is planned anew.
  const getValidLockedRecipe = (slotKey: string, slotRole: string | undefined): Recipe | null => {
    const recipe = lockedSlots[slotKey] ? lockedRecipes[slotKey] : null;
    return recipe?.id && slotRole && matchesSlotRole(recipe, slotRole)
      && fitsCompleteMealSetting(recipe, compositionKey, config.allowCompleteMeal) ? recipe : null;
  };

  // Locks kept for this plan, per slot key. A lock must fit its slot's role
  // and the one-complete-meal-per-day limit; the first locked complete meal
  // of a day wins and any later one is released like an incompatible lock.
  const keptLocks: Record<string, Recipe> = {};
  days.forEach(day => {
    const dayLocks: Recipe[] = [];
    effectiveSlotRoles.forEach((slotRole, dish) => {
      const locked = getValidLockedRecipe(`${day}-${dish}`, slotRole);
      if (locked && fitsDailyCompleteMealLimit(locked, dayLocks)) {
        keptLocks[`${day}-${dish}`] = locked;
        dayLocks.push(locked);
      }
    });
  });

  // Pre-populate usedRecipeIds with kept locked recipes to prevent duplication,
  // including locks on days outside this plan (they are kept for later)
  Object.values(keptLocks).forEach(locked => usedRecipeIds.add(locked.id));
  Object.keys(lockedRecipes).forEach(slotKey => {
    const dash = slotKey.lastIndexOf('-');
    if (days.includes(slotKey.slice(0, dash))) return;
    const locked = getValidLockedRecipe(slotKey, effectiveSlotRoles[Number(slotKey.slice(dash + 1))]);
    if (locked) usedRecipeIds.add(locked.id);
  });

  // Note: Pantry affects SCORING, not filtering
  // Pantry bonus is applied in the scoring section below

  // Pre-normalize pantry ONCE (optimization)
  const normPantry = pantryIngredients.length > 0 ? normalizeIngredients(pantryIngredients) : [];

  // Find perfect pantry matches (recipes that use ALL pantry ingredients)
  const pantryMatchStart = perfNow();
  let perfectMatchRecipe: Recipe | null = null;
  if (normPantry.length > 0 && filtered.length > 0) {
    // DEBUG: Log pantry ingredients
    
    // Use canonical_ingredients as primary source
    let perfectMatches = filtered.filter(r => {
      const recipeCanonical = getRecipeCanonicalSet(r);
      return normPantry.every(p => recipeCanonical.has(p));
    });
    
    // Fallback: if no canonical match, try Chinese partial matching
    if (perfectMatches.length === 0) {
      perfectMatches = filtered.filter(r => {
        const recipeText = getRecipeSearchText(r);
        
        // For Chinese, use partial match
        return pantryIngredients.every(p => recipeText.includes(p.toLowerCase()));
      });
    }
    
    
    if (perfectMatches.length > 0) {
      // Pick one random perfect match
      const preferredMatches = preferBudgetRecipes(perfectMatches, budget);
      perfectMatchRecipe = preferredMatches[Math.floor(Math.random() * preferredMatches.length)];
    }
  }
  const pantryEnd = perfNow();
  if (traceId) {
    perfLog({
      traceId,
      event: 'meal_planner',
      stage: 'perfect_pantry_match',
      label: 'mealPlanner.perfectPantryMatch',
      start: pantryMatchStart,
      end: pantryEnd,
      meta: {
        pantryCount: normPantry.length,
        filteredCount: filtered.length,
        perfectMatchFound: !!perfectMatchRecipe
      }
    });
  }

  // Generate plan
  const dayGenStart = perfNow();
  
  // Day-based protein history for rotation penalty (not slot-based)
  const dayProteinHistory: string[][] = [];
  
  days.forEach((day, dayIndex) => {
    const dayStart = perfNow();
    const dayRecipes: PlanSlot[] = [];
    const dayProteins: string[] = [];
    
    for (let dish = 0; dish < effectiveSlotRoles.length; dish++) {
      const slotRole = effectiveSlotRoles[dish];
      const slotKey = `${day}-${dish}`;
      // The rest of this day: slots already filled plus locks still to come
      const otherSlotsInDay: PlanSlot[] = [
        ...dayRecipes,
        ...effectiveSlotRoles.slice(dish + 1).map((_, i) => keptLocks[`${day}-${dish + 1 + i}`] ?? null),
      ];
      
      // Use locked recipe if it was kept for this slot
      const lockedRecipe = keptLocks[slotKey];
      if (lockedRecipe) {
        dayRecipes.push(lockedRecipe);
        applyRecipeSelection(lockedRecipe, usedRecipeIds, recentProteins, recentMethods);
        continue;
      }
      
      // GUARANTEE: Use perfect match only if it matches current slot role
      if (perfectMatchRecipe && !usedRecipeIds.has(perfectMatchRecipe.id)) {
        // Only use perfect match if it fits the current slot's role and the day
        if (matchesSlotRole(perfectMatchRecipe, slotRole) && fitsDailyCompleteMealLimit(perfectMatchRecipe, otherSlotsInDay)) {
          dayRecipes.push(perfectMatchRecipe);
          applyRecipeSelection(perfectMatchRecipe, usedRecipeIds, recentProteins, recentMethods);
          perfectMatchRecipe = null; // Only use once
          continue;
        }
        // If it doesn't match this slot, keep it for later slots (will use fallback)
      }
      
      // Calculate diminishing pantry bonus
      const mealPosition = dayIndex * effectiveSlotRoles.length + dish;
      const diminishingFactor = mealPosition < 3 ? 1.0 : (mealPosition < 5 ? 0.5 : 0.2);
      
      // Pre-normalize pantry ONCE before scoring loop (optimization)
      const scoringNormPantry = normPantry;
      
      // Get candidates matching this slot role (with fallback chain)
      let candidates = getCandidatesWithFallback(filtered, slotRole, usedRecipeIds)
        .filter(r => fitsDailyCompleteMealLimit(r, otherSlotsInDay));
      
      // Log slot candidates
      if (traceId) {
        perfLog({
          traceId,
          event: 'meal_planner',
          stage: 'slot_candidates',
          label: 'mealPlanner.slot.candidates',
          duration: 0,
          meta: {
            day,
            dayIndex,
            slotIndex: dish,
            slotRole,
            candidateCount: candidates.length,
            usedRecipeCount: usedRecipeIds.size
          }
        });
      }
      
      // Score candidates and maintain top 3 only (optimization: avoid full array sort)
      // Use simple insertion to keep only top 3 instead of sorting entire array
      let top3: { recipe: Recipe; score: number }[] = [];
      
      // Collect current day's proteins for hard constraints
        const dayProteins = dayRecipes.map(d => d?.primary_protein).filter(Boolean);
        
        for (const r of candidates) {
        let score = 5; // base score

        // Editorial budget tier is the only price signal in the recipe catalogue.
        // A bonus preserves role, diversity and pantry scoring, and unlabelled
        // recipes remain eligible when there are no tier matches.
        if (matchesBudgetPreference(r, budget)) score += 5;
        
        // Repeat penalty - exclude already used recipes or heavily penalize
        if (usedRecipeIds.has(r.id)) {
          score -= 100; // Heavy penalty to avoid repeats
        }
        
        // Max 1 complete_meal per day is enforced on the candidate list above
        const isComplete = matchesSlotRole(r, 'complete_meal');
        
        // HARD CONSTRAINT: No same protein within same day
        const candidateProtein = r.primary_protein || r.protein?.[0];
        if (candidateProtein && dayProteins.includes(candidateProtein)) {
          score -= 6; // Stronger penalty for same-day protein duplication
        }
        
        // Complete meal handling in mixed modes (allowCompleteMeal=false never
        // reaches here: such recipes are filtered out of the pool above)
        if (isComplete && compositionConfig && compositionConfig.completeMealPenalty !== 0) {
          // Apply normal penalty when allowCompleteMeal = true
          score += compositionConfig.completeMealPenalty;
        }
        
        // Protein diversity (positive scoring)
        const protein = r.primary_protein || r.protein?.[0];
        if (protein && recentProteins.length > 0) {
          if (!recentProteins.slice(-PLANNER_RULES.PROTEIN_LOOKBACK.WITHIN_2_DAYS).includes(protein)) {
            score += PLANNER_WEIGHTS.PROTEIN_NEW;
          } else {
            score += PLANNER_WEIGHTS.PROTEIN_SAME_DAY;
          }
        }
        
        // Protein rotation penalty (day-based, not slot-based)
        if (protein && dayProteinHistory.length > 0) {
          const yesterdayProteins = dayProteinHistory[dayProteinHistory.length - 1] || [];
          const last2DaysProteins = dayProteinHistory.slice(-2).flat();
          if (yesterdayProteins.includes(protein)) {
            score -= 3; // Stronger penalty for same protein yesterday
          } else if (last2DaysProteins.includes(protein)) {
            score -= 2; // Penalty for repeat within last 2 days
          }
        }
        
        // Method diversity
        const method = r.method;
        if (method && recentMethods.length > 0) {
          if (!recentMethods.slice(-2).includes(method)) {
            score += 1;
          } else {
            score += PLANNER_WEIGHTS.PROTEIN_SAME_DAY;
          }
        }
        
        // Pantry bonus with diminishing factor
        if (pantryIngredients.length > 0) {
          // Primary: use canonical ingredients
          const recipeCanonical = getRecipeCanonicalSet(r);
          
          // Primary: count matches against canonical ingredients
          let matches = normPantry.filter(p => recipeCanonical.has(p));
          
          // Fallback: if no canonical match, try partial text match for Chinese
          if (matches.length === 0) {
            const recipeText = getRecipeSearchText(r);
            
            matches = pantryIngredients.filter(p => recipeText.includes(p.toLowerCase()));
          }
          
          if (matches.length > 0) {
            score += matches.length * WEIGHTS.PANTRY_MATCH * diminishingFactor;
            
            // Repetition penalty - check how many times pantry ingredients used
            const usedCount = usedPantryIngredients.filter(u => matches.includes(u)).length;
            if (usedCount > 0) {
              score -= 0.5 * usedCount;
            }
          }
        }
        
        // Add randomness to score
        const randomMultiplier = 1 + (Math.random() * RANDOM_FACTOR * 2 - RANDOM_FACTOR);
        score *= randomMultiplier;
        
        // Maintain top 3 using simple insertion sort (O(n) instead of O(n log n))
        // Keep sorted descending by score
        if (top3.length < 3) {
          top3.push({ recipe: r, score });
          top3.sort((a, b) => b.score - a.score);
        } else if (score > top3[top3.length - 1].score) {
          top3.pop();
          top3.push({ recipe: r, score });
          top3.sort((a, b) => b.score - a.score);
        }
      }
      
      // Weighted random selection: pick from top candidates
      // Use Math.max to avoid 0 or negative scores
      const topCandidates = top3;
      const totalWeight = topCandidates.reduce((sum, s) => sum + Math.max(s.score, 0.001), 0);
      let random = Math.random() * totalWeight;
      let selected = topCandidates[0]?.recipe;
      
      for (const candidate of topCandidates) {
        const weight = Math.max(candidate.score, 0.001);
        random -= weight;
        if (random <= 0) {
          selected = candidate.recipe;
          break;
        }
      }
      
      // AFTER selection: update pantry tracking
      if (selected && pantryIngredients.length > 0) {
        // Use canonical ingredients for tracking (same as scoring)
        const recipeCanonical = selected.canonical_ingredients ? new Set(selected.canonical_ingredients) : getRecipeCanonicalSet(selected);
        const pantryForScoring = normPantry;
        
        // Primary: track canonical matches
        let selectedMatches = normPantry.filter(p => recipeCanonical.has(p));
        
        // Fallback: if no canonical match, try partial text
        if (selectedMatches.length === 0) {
          const recipeText = getRecipeSearchText(selected);
          
          selectedMatches = pantryIngredients.filter(p => recipeText.includes(p.toLowerCase()));
        }
        
        selectedMatches.forEach(m => usedPantryIngredients.push(m));
      }
      
      if (selected) {
        dayRecipes.push(selected);
        applyRecipeSelection(selected, usedRecipeIds, recentProteins, recentMethods);
      } else {
        // Preserve slot indices for the grid, replace action, and save mapper.
        dayRecipes.push(null);
      }
    }
    
    // Save day's proteins to history for next day penalties
    dayRecipes.forEach(r => {
      const p = r?.primary_protein || r?.protein?.[0];
      if (p) dayProteins.push(p);
    });
    // Log day total
    const dayEnd = perfNow();
    if (traceId) {
      perfLog({
        traceId,
        event: 'meal_planner',
        stage: 'day_total',
        label: 'mealPlanner.day.total',
        start: dayStart,
        end: dayEnd,
        meta: { day, dayIndex, selectedCount: dayRecipes.filter(Boolean).length }
      });
    }
    
    dayProteinHistory.push(dayProteins);
    
    result[day] = dayRecipes;
  });

  // Log total planner duration
  const fnEnd = perfNow();
  if (traceId) {
    perfLog({
      traceId,
      event: 'meal_planner',
      stage: 'planner_total',
      label: 'mealPlanner.total',
      start: fnStart,
      end: fnEnd
    });
    perfLog({
      traceId,
      event: 'meal_planner',
      stage: 'day_loop_total',
      label: 'mealPlanner.dayLoop.total',
      start: dayGenStart,
      end: fnEnd,
      meta: { dayCount: days.length }
    });
  }
  
  return result;
}

/**
 * DEPRECATED: Pantry now affects SCORING only, not filtering.
 * This function returns all recipes to ensure pantry never shrinks candidate pool.
 */
