import { normalizeIngredients, getRecipeCanonicalIngredients } from './ingredientNormalizer'

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

// Weight configuration
const WEIGHTS = {
  // Repeat penalty
  REPEAT_PENALTY: -3,
  
  // Protein diversity
  PROTEIN_SAME_DAY: -2,
  PROTEIN_WITHIN_2_DAYS: -1,
  PROTEIN_NEW: 2,
  
  // Method diversity
  METHOD_SAME_DAY: -1,
  METHOD_NEW: 1,
  
  // Pantry (uses normalized ingredients) - strong bonus
  PANTRY_MATCH: 12,
  
  // Speed bias (weekday)
  SPEED_QUICK: 1,
  SPEED_NORMAL: 0.5,
  SPEED_SLOW: -1,
  
  // Difficulty bias
  DIFFICULTY_EASY: 1,
  DIFFICULTY_MEDIUM: 0,
  DIFFICULTY_HARD: -0.5,
  
  // Variety bonus (new cuisine)
  VARIETY_NEW_CUISINE: 0.5,
  
  // Missing penalty
  MISSING_PENALTY: 0.1,
  
  // Base
  BASE_SCORE: 5,
}

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
  isWeekend: (dayKey: string) => boolean;
  cuisines?: string[];
  exclusions?: string[];
  cookingConstraints?: string[];
  budget?: string;
  pantryIngredients?: string[];
  lockedSlots?: Record<string, boolean>;
  lockedRecipes?: Record<string, Recipe>;
}

export function planWeekAdvanced(
  recipes: Recipe[],
  config: PlanConfig
): Record<string, Recipe[]> {
  const {
    daysPerWeek,
    dishesPerDay,
    isWeekend,
    cuisines = [],
    exclusions = [],
    cookingConstraints = [],
    budget,
    pantryIngredients = [],
    lockedSlots = {},
    lockedRecipes = {}
  } = config;

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].slice(0, daysPerWeek);
  const result: Record<string, Recipe[]> = {};
  const usedRecipeIds = new Set<string>(); // Track used recipes to avoid repeats
  const recentProteins: string[] = [];
  const recentMethods: string[] = [];
  const usedPantryIngredients: string[] = [];

  // Filter recipes
  let filtered = recipes.filter(r => {
    if (cuisines.length > 0 && r.cuisine && !cuisines.includes(r.cuisine)) return false;
    if (exclusions.length > 0) {
      // Check both primary_protein and protein array
      const proteinValues = [r.primary_protein, ...(r.protein || [])].filter(Boolean);
      const normProtein = normalizeIngredients(proteinValues);
      const normExclusions = normalizeIngredients(exclusions);
      
      // If any exclusion matches normalized protein, filter out
      if (normProtein.some(p => normExclusions.includes(p))) {
        return false;
      }
    }
    return true;
  });

  // Pre-populate usedRecipeIds with locked recipes to prevent duplication
  if (lockedRecipes) {
    Object.values(lockedRecipes).forEach(r => {
      if (r && r.id) usedRecipeIds.add(r.id);
    });
  }

  // Note: Pantry affects SCORING, not filtering
  // Pantry bonus is applied in the scoring section below

  // Find perfect pantry matches (recipes that use ALL pantry ingredients)
  let perfectMatchRecipe: Recipe | null = null;
  if (pantryIngredients.length > 0 && filtered.length > 0) {
    // DEBUG: Log pantry ingredients
    console.log('[PLANNER] pantryIngredients:', pantryIngredients);
    
    // Get normalized pantry ingredients
    const normPantry = normalizeIngredients(pantryIngredients);
    console.log('[PLANNER] normalized pantry:', normPantry);
    
    // Use canonical_ingredients as primary source
    let perfectMatches = filtered.filter(r => {
      const canonical = getRecipeCanonicalIngredients(r);
      const recipeCanonical = new Set(canonical);
      return normPantry.every(p => recipeCanonical.has(p));
    });
    
    // Fallback: if no canonical match, try Chinese partial matching
    if (perfectMatches.length === 0) {
      perfectMatches = filtered.filter(r => {
        const recipeText = [
          r.name,
          r.description,
          r.cuisine,
          r.method,
          r.dish_type,
          r.primary_protein,
          ...(r.ingredients_list || [])
        ].filter(Boolean).join(' ').toLowerCase();
        
        // For Chinese, use partial match
        return pantryIngredients.every(p => recipeText.includes(p.toLowerCase()));
      });
    }
    
    console.log('[PLANNER] perfectMatches:', perfectMatches.map(r => r.name));
    
    if (perfectMatches.length > 0) {
      // Pick one random perfect match
      perfectMatchRecipe = perfectMatches[Math.floor(Math.random() * perfectMatches.length)];
      console.log('[PLANNER] Selected perfect match:', perfectMatchRecipe.name);
    }
  }

  // Generate plan
  days.forEach((day, dayIndex) => {
    const dayRecipes: Recipe[] = [];
    
    for (let dish = 0; dish < dishesPerDay; dish++) {
      const slotKey = `${day}-${dish}`;
      
      // Use locked recipe if exists
      if (lockedSlots[slotKey] && lockedRecipes[slotKey]) {
        dayRecipes.push(lockedRecipes[slotKey]);
        applyRecipeSelection(lockedRecipes[slotKey], usedRecipeIds, recentProteins, recentMethods);
        continue;
      }
      
      // GUARANTEE: Use perfect match in first available slot
      if (perfectMatchRecipe && !usedRecipeIds.has(perfectMatchRecipe.id)) {
        dayRecipes.push(perfectMatchRecipe);
        applyRecipeSelection(perfectMatchRecipe, usedRecipeIds, recentProteins, recentMethods);
        perfectMatchRecipe = null; // Only use once
        continue;
      }
      
      // Calculate diminishing pantry bonus
      const mealPosition = dayIndex * dishesPerDay + dish;
      const diminishingFactor = mealPosition < 3 ? 1.0 : (mealPosition < 5 ? 0.5 : 0.2);
      
      // Score candidates
      const scored = filtered.map(r => {
        let score = 5; // base score
        
        // Repeat penalty - exclude already used recipes or heavily penalize
        if (usedRecipeIds.has(r.id)) {
          score -= 100; // Heavy penalty to avoid repeats
        }
        
        // Protein diversity
        const protein = r.primary_protein || r.protein?.[0];
        if (protein && recentProteins.length > 0) {
          if (!recentProteins.slice(-3).includes(protein)) {
            score += 2;
          } else {
            score -= 1;
          }
        }
        
        // Method diversity
        const method = r.method;
        if (method && recentMethods.length > 0) {
          if (!recentMethods.slice(-2).includes(method)) {
            score += 1;
          } else {
            score -= 1;
          }
        }
        
        // Pantry bonus with diminishing factor
        if (pantryIngredients.length > 0) {
          // Primary: use canonical ingredients
          const canonical = getRecipeCanonicalIngredients(r);
          const recipeCanonical = new Set(canonical);
          const normPantry = normalizeIngredients(pantryIngredients);
          
          // Primary: count matches against canonical ingredients
          let matches = normPantry.filter(p => recipeCanonical.has(p));
          
          // Fallback: if no canonical match, try partial text match for Chinese
          if (matches.length === 0) {
            const recipeText = [
              r.name,
              r.description,
              r.cuisine,
              r.method,
              r.dish_type,
              r.primary_protein,
              ...(r.ingredients_list || [])
            ].filter(Boolean).join(' ').toLowerCase();
            
            matches = pantryIngredients.filter(p => recipeText.includes(p.toLowerCase()));
          }
          
          if (matches.length > 0) {
            score += matches.length * WEIGHTS.PANTRY_MATCH * diminishingFactor;
            
            // Repetition penalty - check how many times pantry ingredients used
            const usedCount = usedPantryIngredients.filter(u => matches.includes(u)).length;
            if (usedCount > 0) {
              score -= 0.5 * usedCount;
            }
            // Note: Don't push here - push AFTER selection
          }
        }
        
        return { recipe: r, score };
      });
      
      // Sort by score and pick top
      scored.sort((a, b) => b.score - a.score);
      const selected = scored[0]?.recipe;
      
      // AFTER selection: update pantry tracking
      if (selected && pantryIngredients.length > 0) {
        // Use canonical ingredients for tracking (same as scoring)
        const canonical = selected.canonical_ingredients || [];
        const recipeCanonical = new Set(canonical);
        const normPantry = normalizeIngredients(pantryIngredients);
        
        // Primary: track canonical matches
        let selectedMatches = normPantry.filter(p => recipeCanonical.has(p));
        
        // Fallback: if no canonical match, try partial text
        if (selectedMatches.length === 0) {
          const recipeText = [
            selected.name,
            selected.description,
            selected.cuisine,
            selected.method,
            selected.dish_type,
            selected.primary_protein,
            ...(selected.ingredients_list || [])
          ].filter(Boolean).join(' ').toLowerCase();
          
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
