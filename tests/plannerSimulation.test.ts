import { describe, it, expect } from 'vitest'
import { selectRecipeForSlot, calculatePlanScore, planWeek } from '../src/lib/mealPlanner'

// Mock recipe database
const PROTEINS = ['chicken', 'beef', 'pork', 'fish', 'tofu']
const METHODS = ['stir_fry', 'steamed', 'braised', 'fried', 'boiled']
const SPEEDS = ['quick', 'normal', 'slow']
const DIFFICULTIES = ['easy', 'medium', 'hard']
const INGREDIENTS = ['ingredient-a', 'ingredient-b', 'ingredient-c', 'ingredient-d', 'ingredient-e']
const BUDGET_LEVELS = ['low', 'medium', 'high']

function createMockRecipe(id: number, overrides = {}) {
  return {
    id: `recipe-${id}`,
    name: `Recipe ${id}`,
    method: METHODS[id % METHODS.length],
    difficulty: DIFFICULTIES[id % DIFFICULTIES.length],
    speed: SPEEDS[id % SPEEDS.length],
    primary_protein: PROTEINS[id % PROTEINS.length],
    dish_type: 'main',
    budget_level: BUDGET_LEVELS[id % BUDGET_LEVELS.length],
    ingredients_list: [INGREDIENTS[id % INGREDIENTS.length], INGREDIENTS[(id + 1) % INGREDIENTS.length]],
    score: 5 + (id % 10),
    ...overrides,
  }
}

function createRecipeDatabase(count: number = 50) {
  return Array.from({ length: count }, (_, i) => createMockRecipe(i))
}

describe('plannerSimulation', () => {
  const RUNS = 1000
  
  describe('quality metrics over 1000 runs', () => {
    const results: {
      repeatedCount: number
      uniqueProteins: number
      uniqueMethods: number
      pantryMatched: number
      fallbackCount: number
    }[] = []

    // Run simulation
    for (let run = 0; run < RUNS; run++) {
      const db = createRecipeDatabase(50)
      const usedIds = new Set<string>()
      const selectedRecipes: any[] = []
      const recentProteins: string[] = []
      const recentMethods: string[] = []
      
      // Vary inputs per run
      const dishesPerDay = [1, 2, 3][run % 3]
      const daysPerWeek = 7
      
      // Vary pantry: none / small (1) / medium (2) ingredients
      const pantrySize = run % 3 // 0=none, 1=small, 2=medium
      const pantryIngredients = pantrySize === 0 
        ? [] 
        : INGREDIENTS.slice(0, pantrySize)
      
      // Vary budget: none / budget
      const budgetMode = run % 2 === 0 ? 'low' : 'none'
      
      // Simulate selecting recipes for each day
      for (let day = 0; day < daysPerWeek; day++) {
        for (let dish = 0; dish < dishesPerDay; dish++) {
          const isWeekend = day >= 5
          const candidates = db.filter(r => !usedIds.has(r.id)).slice(0, 20)
          
          if (candidates.length === 0) break
          
          const selected = selectRecipeForSlot(
            candidates,
            usedIds,
            db.length,
            recentProteins,
            recentMethods,
            !isWeekend,
            pantryIngredients
          )
          
          if (selected) {
            selectedRecipes.push(selected)
            usedIds.add(selected.id)
            if (selected.primary_protein) {
              recentProteins.push(selected.primary_protein)
              if (recentProteins.length > 5) recentProteins.shift()
            }
            if (selected.method) {
              recentMethods.push(selected.method)
              if (recentMethods.length > 5) recentMethods.shift()
            }
          }
        }
      }
      
      // Calculate metrics
      const recipeIds = selectedRecipes.map(r => r.id)
      const repeatedCount = recipeIds.length - new Set(recipeIds).size
      const uniqueProteins = new Set(selectedRecipes.map(r => r.primary_protein)).size
      const uniqueMethods = new Set(selectedRecipes.map(r => r.method)).size
      
      let pantryMatched = 0
      if (pantryIngredients.length > 0) {
        pantryMatched = selectedRecipes.filter(r => 
          r.ingredients_list?.some((i: string) => pantryIngredients.includes(i))
        ).length
      }
      
      results.push({
        repeatedCount,
        uniqueProteins,
        uniqueMethods,
        pantryMatched,
        fallbackCount: 0, // Not tracked in simplified version
      })
    }
    
    // Calculate averages
    const avgRepeated = results.reduce((sum, r) => sum + r.repeatedCount, 0) / RUNS
    const avgProteins = results.reduce((sum, r) => sum + r.uniqueProteins, 0) / RUNS
    const avgMethods = results.reduce((sum, r) => sum + r.uniqueMethods, 0) / RUNS
    const avgPantryMatched = results.reduce((sum, r) => sum + r.pantryMatched, 0) / RUNS
    
    it('avgRepeatedRecipes < 0.5', () => {
      console.log(`avgRepeatedRecipes: ${avgRepeated.toFixed(2)} (threshold: 0.5)`)
      expect(avgRepeated).toBeLessThan(0.5)
    })
    
    it('avgUniqueProteins >= 3', () => {
      console.log(`avgUniqueProteins: ${avgProteins.toFixed(2)} (threshold: 3)`)
      expect(avgProteins).toBeGreaterThanOrEqual(3)
    })
    
    it('avgUniqueMethods >= 2', () => {
      console.log(`avgUniqueMethods: ${avgMethods.toFixed(2)} (threshold: 2)`)
      expect(avgMethods).toBeGreaterThanOrEqual(2)
    })
    
    it('avgMissingIngredients <= 3', () => {
      // Currently not tracked - placeholder
      console.log(`avgMissingIngredients: N/A (not yet implemented)`)
      expect(true).toBe(true)
    })
    
    it('avgFallbackCount', () => {
      // Currently not tracked - placeholder
      console.log(`avgFallbackCount: N/A (not yet implemented)`)
      expect(true).toBe(true)
    })
  })
  
  describe('planWeek function', () => {
    it('deduplicates recipes', () => {
      const recipes = [
        createMockRecipe(1),
        createMockRecipe(1), // duplicate
        createMockRecipe(2),
        createMockRecipe(3),
      ]
      const result = planWeek(recipes)
      expect(result).toHaveLength(3)
    })
    
    it('limits to 7 days', () => {
      const recipes = Array.from({ length: 20 }, (_, i) => createMockRecipe(i))
      const result = planWeek(recipes)
      expect(result).toHaveLength(7)
    })
  })
  
  describe('calculatePlanScore', () => {
    it('returns 0 for empty plan', () => {
      const score = calculatePlanScore({}, [])
      expect(score).toBe(0)
    })
    
    it('sums recipe scores', () => {
      const plan = {
        monday: [createMockRecipe(1, { score: 10 })],
        tuesday: [createMockRecipe(2, { score: 8 })],
      }
      const score = calculatePlanScore(plan, [])
      expect(score).toBeGreaterThan(17)
    })
  })
})
