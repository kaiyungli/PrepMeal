import { normalizeIngredients } from './ingredientNormalizer'

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
  PANTRY_MATCH: 5,
  
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
export function selectRecipeForSlot(
  candidates: Recipe[],
  usedIds: Set<string>,
  totalAvailable: number,
  recentProteins: string[] = [],
  recentMethods: string[] = [],
  recentCuisines: string[] = [],
  isWeekday: boolean = false,
  pantryIngredients: string[] = [],
  budgetMode: string = 'none'
): Recipe | null {
  if (candidates.length === 0) return null
  
  // Score each candidate
  const scored = candidates.map(r => {
    let totalScore = r.score || WEIGHTS.BASE_SCORE
    const reasons: string[] = []
    
    // Repeat penalty: if recipe was already used earlier in the week
    const isRepeated = usedIds.has(r.id)
    if (isRepeated) {
      totalScore += WEIGHTS.REPEAT_PENALTY
      reasons.push('repeat_penalty')
    }
    
    // Protein diversity
    const proteinResult = scoreProteinDiversity(r.primary_protein, recentProteins)
    totalScore += proteinResult.score
    if (proteinResult.reason) reasons.push(proteinResult.reason)
    
    // Method diversity
    const methodResult = scoreMethodDiversity(r.method, recentMethods)
    totalScore += methodResult.score
    if (methodResult.reason) reasons.push(methodResult.reason)
    
    // Weekday speed bias
    const speedResult = scoreWeekdaySpeed(r.speed, isWeekday)
    totalScore += speedResult.score
    if (speedResult.reason) reasons.push(speedResult.reason)
    
    // Difficulty bias
    const difficultyResult = scoreDifficulty(r.difficulty)
    totalScore += difficultyResult.score
    if (difficultyResult.reason) reasons.push(difficultyResult.reason)
    
    // Cuisine variety bonus (NEW this week)
    if (r.cuisine && !recentCuisines.includes(r.cuisine)) {
      totalScore += WEIGHTS.VARIETY_NEW_CUISINE
      reasons.push('new_cuisine')
    }
    
    // Pantry bonus: uses normalized ingredients + text fallback
    if (pantryIngredients.length > 0) {
      const normalizedPantry = normalizeIngredients(pantryIngredients)
      
      // Check ingredients_list
      const normalizedRecipe = r.ingredients_list ? normalizeIngredients(r.ingredients_list) : []
      
      // Also check text fields (name, description, etc.)
      const textFields = [
        r.name,
        r.description,
        r.cuisine,
        r.method,
        r.dish_type,
        r.primary_protein
      ].filter(Boolean).join(' ').toLowerCase()
      const normalizedText = normalizeIngredients(textFields.split(/[\s,]+/).filter(Boolean))
      
      // Combine all recipe ingredients
      const allRecipeIngs = [...normalizedRecipe, ...normalizedText]
      
      const matches = normalizedPantry.filter(p => allRecipeIngs.includes(p))
      if (matches.length > 0) {
        totalScore += matches.length * WEIGHTS.PANTRY_MATCH
        reasons.push(`pantry_match_${matches.length}`)
      }
    }
    
    return { recipe: r, score: totalScore, reasons }
  })
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)
  
  return scored[0]?.recipe || candidates[0]
}

/**
 * Calculate overall plan score
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
      const protein = r.protein || [];
      if (exclusions.some(ex => protein.includes(ex))) return false;
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
    // Check both normalized and original Chinese text for matches
    const perfectMatches = filtered.filter(r => {
      const recipeTextRaw = [
        r.name,
        r.description,
        r.cuisine,
        r.method,
        r.dish_type,
        r.primary_protein,
        ...(r.ingredients_list || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      // Also check normalized version
      const recipeTextNorm = normalizeIngredients(recipeTextRaw.split(/[\s,]+/).filter(Boolean));
      
      // Check each pantry ingredient - must match either raw or normalized text
      return pantryIngredients.every(p => {
        const pLower = p.toLowerCase();
        const pNorm = normalizeIngredients([p])[0];
        return recipeTextRaw.includes(pLower) || recipeTextNorm.includes(pNorm);
      });
    });
    
    if (perfectMatches.length > 0) {
      // Pick one random perfect match
      perfectMatchRecipe = perfectMatches[Math.floor(Math.random() * perfectMatches.length)];
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
        usedRecipeIds.add(lockedRecipes[slotKey].id);
        continue;
      }
      
      // GUARANTEE: Use perfect match in first available slot
      if (perfectMatchRecipe && !usedRecipeIds.has(perfectMatchRecipe.id)) {
        dayRecipes.push(perfectMatchRecipe);
        usedRecipeIds.add(perfectMatchRecipe.id);
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
          const recipeTextRaw = [
            r.name,
            r.description,
            r.cuisine,
            r.method,
            r.dish_type,
            r.primary_protein
          ].filter(Boolean).join(' ').toLowerCase();
          
          const normPantry = normalizeIngredients(pantryIngredients);
          
          // Check matches - both raw text and normalized
          const matches = pantryIngredients.filter(p => {
            const pLower = p.toLowerCase();
            const pNorm = normalizeIngredients([p])[0];
            return recipeTextRaw.includes(pLower) || normPantry.includes(pNorm);
          });
          
          if (matches.length > 0) {
            score += matches.length * 5 * diminishingFactor;
            
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
        const recipeTextRaw = [
          selected.name,
          selected.description,
          selected.cuisine,
          selected.method,
          selected.dish_type,
          selected.primary_protein
        ].filter(Boolean).join(' ').toLowerCase();
        
        // Track matched pantry ingredients (use original form)
        const selectedMatches = pantryIngredients.filter(p => {
          const pLower = p.toLowerCase();
          return recipeTextRaw.includes(pLower);
        });
        selectedMatches.forEach(m => usedPantryIngredients.push(m));
      }
      
      if (selected) {
        dayRecipes.push(selected);
        usedRecipeIds.add(selected.id); // Track used recipe
        const protein = selected.primary_protein || selected.protein?.[0];
        if (protein) recentProteins.push(protein);
        const method = selected.method;
        if (method) recentMethods.push(method);
      }
    }
    
    result[day] = dayRecipes;
  });

  return result;
}

/**
 * Filter recipes by pantry - returns pantry-matched recipes if any exist
 */
export function filterByPantry(
  recipes: Recipe[],
  pantryIngredients: string[]
): Recipe[] {
  if (!pantryIngredients || pantryIngredients.length === 0) {
    return recipes;
  }
  
  const normPantry = normalizeIngredients(pantryIngredients);
  
  const pantryMatched = recipes.filter(r => {
    // Check ingredients_list
    const recipeIngs = r.ingredients_list || [];
    const normRecipeIngs = normalizeIngredients(recipeIngs);
    
    // Check text fields
    const textFields = [
      r.name,
      r.description,
      r.cuisine,
      r.method,
      r.dish_type,
      r.primary_protein
    ].filter(Boolean).join(' ').toLowerCase();
    const normText = normalizeIngredients(textFields.split(/[\s,]+/).filter(Boolean));
    
    const allIngs = [...normRecipeIngs, ...normText];
    return normPantry.some(p => allIngs.includes(p));
  });
  
  return pantryMatched.length > 0 ? pantryMatched : recipes;
}
