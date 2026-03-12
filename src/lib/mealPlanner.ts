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
  // Protein diversity
  PROTEIN_SAME_DAY: -2,
  PROTEIN_WITHIN_2_DAYS: -1,
  PROTEIN_NEW: 2,
  
  // Method diversity
  METHOD_SAME_DAY: -1,
  METHOD_NEW: 1,
  
  // Pantry (uses normalized ingredients)
  PANTRY_MATCH: 1,
  
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
    
    // Pantry bonus: uses normalized ingredients
    if (pantryIngredients.length > 0 && r.ingredients_list) {
      const normalizedPantry = normalizeIngredients(pantryIngredients)
      const normalizedRecipe = normalizeIngredients(r.ingredients_list)
      const matches = normalizedPantry.filter(p => normalizedRecipe.includes(p))
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
