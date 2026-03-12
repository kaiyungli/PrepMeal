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
  score?: number
  [key: string]: any
}

/**
 * Select the best recipe for a slot considering all constraints
 */
export function selectRecipeForSlot(
  candidates: Recipe[],
  usedIds: Set<string>,
  totalAvailable: number,
  recentProteins: string[] = [],
  recentMethods: string[] = [],
  isWeekday: boolean = false,
  pantryIngredients: string[] = []
): Recipe | null {
  if (candidates.length === 0) return null
  
  // Score and filter candidates
  let scored = candidates.map(r => {
    let score = r.score || 0
    const reasons: string[] = []
    
    // Avoid duplicates unless necessary
    if (usedIds.has(r.id) && totalAvailable >= candidates.length) {
      score -= 5
      reasons.push('duplicate')
    }
    
    // Protein rotation
    if (recentProteins.length > 0) {
      const protein = r.primary_protein
      if (protein && !recentProteins.includes(protein)) {
        score += 2
        reasons.push('protein_variety')
      } else if (protein) {
        score -= 1
        reasons.push('protein_repeat')
      }
    }
    
    // Method diversity
    if (recentMethods.length > 0) {
      const method = r.method
      if (method && !recentMethods.includes(method)) {
        score += 1
        reasons.push('method_variety')
      }
    }
    
    // Weekday quick preference
    if (isWeekday && r.speed === 'quick') {
      score += 1
      reasons.push('weekday_quick')
    }
    
    // Pantry bonus
    if (pantryIngredients.length > 0 && r.ingredients_list) {
      const normalizedPantry = normalizeIngredients(pantryIngredients)
      const normalizedRecipe = normalizeIngredients(r.ingredients_list)
      const matches = normalizedPantry.filter(p => normalizedRecipe.includes(p))
      score += matches.length * 1.5
      if (matches.length > 0) {
        reasons.push(`pantry_match_${matches.length}`)
      }
    }
    
    return { recipe: r, score, reasons }
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
      totalScore += recipe.score || 0
      
      // Variety bonus
      if (recipe.primary_protein && !usedProteins.includes(recipe.primary_protein)) {
        totalScore += 0.5
      }
    })
  })
  
  // Repetition penalty
  const proteins = Object.values(plan)
    .flat()
    .map(r => r.primary_protein)
    .filter(Boolean)
  
  const uniqueProteins = new Set(proteins)
  if (proteins.length > uniqueProteins.size) {
    totalScore -= (proteins.length - uniqueProteins.size) * 0.5
  }
  
  return totalScore
}

/**
 * Plan the week with balanced selection
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
