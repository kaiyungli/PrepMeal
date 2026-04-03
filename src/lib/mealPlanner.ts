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
import { perfNow, perfMeasure, perfStage } from '@/utils/perf';
import { PLANNER_WEIGHTS, PLANNER_RULES } from '@/constants/planner'

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
  budget_level?: string
  cuisine?: string
  score?: number
  [key: string]: any
}

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
  plan: Record<string, Recipe[]>,
  usedProteins: string[] = []
): number {
  let totalScore = 0
  
  Object.values(plan).forEach(dayRecipes => {
    dayRecipes.forEach(recipe => {
      totalScore += recipe.score || WEIGHTS.BASE_SCORE
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
  isWeekend: (dayKey: string) => boolean;
  cuisines?: string[];
  exclusions?: string[];
  cookingConstraints?: string[];
  budget?: string;
  pantryIngredients?: string[];
  lockedSlots?: Record<string, boolean>;
  lockedRecipes?: Record<string, Recipe>;
}

// Helper to check if a recipe matches a slot role with refined priority
function matchesSlotRole(recipe: Recipe, slotRole: string): boolean {
  const mealRole = recipe.meal_role;
  const dishType = recipe.dish_type;
  const isCompleteMeal = recipe.is_complete_meal;
  const primaryProtein = recipe.primary_protein;
  
  // Role-specific matching with priority
  switch (slotRole) {
    case 'complete_meal':
      return mealRole === 'complete_meal' || isCompleteMeal === true;
    
    case 'protein_main':
      // Priority 1: explicit meal_role
      if (mealRole === 'protein_main') return true;
      // Priority 2: dish_type === 'main' (main course)
      if (dishType === 'main') return true;
      // Priority 3: primary protein exists (protein-tagged recipe)
      if (!!primaryProtein) return true;
      return false;
    
    case 'veg_side':
      // Priority 1: explicit meal_role
      if (mealRole === 'veg_side') return true;
      // Priority 2: dish_type === 'side' AND NO primary protein
      // Avoid protein-heavy "sides" being treated as veg sides
      if (dishType === 'side' && !primaryProtein) return true;
      return false;
    
    case 'soup':
      return mealRole === 'soup' || dishType === 'soup';
    
    // Explicit fallback roles
    case 'main':
      return dishType === 'main';
    case 'side':
      return dishType === 'side';
    case 'any':
      return true;
    default:
      return false;
  }
}

// Fallback chain for when exact role has no candidates
function getCandidatesWithFallback(
  recipes: Recipe[], 
  slotRole: string,
  usedRecipeIds: Set<string>
): Recipe[] {
  const exactMatch = recipes.filter(r => 
    !usedRecipeIds.has(r.id) && matchesSlotRole(r, slotRole)
  );
  if (exactMatch.length > 0) return exactMatch;
  
  // Fallback chain per role - explicit dish_type fallbacks
  const fallbacks: Record<string, string[]> = {
    'protein_main': ['protein_main', 'main', 'any'],
    'veg_side': ['veg_side', 'side', 'any'],
    'soup': ['soup', 'side', 'any'],
    'complete_meal': ['complete_meal', 'main', 'any']
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
  config: PlanConfig
): Record<string, Recipe[]> {
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
  const result: Record<string, Recipe[]> = {};
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
  perfStage('mealPlanner.filtering', filterStart, perfNow());

  // Pre-populate usedRecipeIds with locked recipes to prevent duplication
  if (lockedRecipes) {
    Object.values(lockedRecipes).forEach(r => {
      if (r && r.id) usedRecipeIds.add(r.id);
    });
  }

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
      perfectMatchRecipe = perfectMatches[Math.floor(Math.random() * perfectMatches.length)];
    }
  }
  perfStage('mealPlanner.perfectPantryMatch', pantryMatchStart, perfNow());

  // Generate plan
  const dayGenStart = perfNow();
  days.forEach((day, dayIndex) => {
    const dayRecipes: Recipe[] = [];
    
    for (let dish = 0; dish < effectiveSlotRoles.length; dish++) {
      const slotRole = effectiveSlotRoles[dish];
      const slotKey = `${day}-${dish}`;
      
      // Use locked recipe if exists
      if (lockedSlots[slotKey] && lockedRecipes[slotKey]) {
        dayRecipes.push(lockedRecipes[slotKey]);
        applyRecipeSelection(lockedRecipes[slotKey], usedRecipeIds, recentProteins, recentMethods);
        continue;
      }
      
      // GUARANTEE: Use perfect match only if it matches current slot role
      if (perfectMatchRecipe && !usedRecipeIds.has(perfectMatchRecipe.id)) {
        // Only use perfect match if it fits the current slot's role
        if (matchesSlotRole(perfectMatchRecipe, slotRole)) {
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
      const candidates = getCandidatesWithFallback(filtered, slotRole, usedRecipeIds);
      
      // Score candidates and maintain top 3 only (optimization: avoid full array sort)
      // Use simple insertion to keep only top 3 instead of sorting entire array
      let top3: { recipe: Recipe; score: number }[] = [];
      
      for (const r of candidates) {
        let score = 5; // base score
        
        // Repeat penalty - exclude already used recipes or heavily penalize
        if (usedRecipeIds.has(r.id)) {
          score -= 100; // Heavy penalty to avoid repeats
        }
        
        // Protein diversity
        const protein = r.primary_protein || r.protein?.[0];
        if (protein && recentProteins.length > 0) {
          if (!recentProteins.slice(-PLANNER_RULES.PROTEIN_LOOKBACK.WITHIN_2_DAYS).includes(protein)) {
            score += PLANNER_WEIGHTS.PROTEIN_NEW;
          } else {
            score += PLANNER_WEIGHTS.PROTEIN_SAME_DAY;
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
      }
    }
    
    result[day] = dayRecipes;
  });

  return result;
}

/**
 * DEPRECATED: Pantry now affects SCORING only, not filtering.
 * This function returns all recipes to ensure pantry never shrinks candidate pool.
 */
