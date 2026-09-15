import { describe, it, expect } from 'vitest'
import { calculatePlanScore, planWeek } from '../src/lib/mealPlanner'

// Mock recipe data
const createRecipe = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2, 8),
  name: 'Test Recipe',
  method: 'stir_fry',
  difficulty: 'easy',
  speed: 'quick',
  primary_protein: 'chicken',
  dish_type: 'main',
  ingredients_list: [],
  score: 5,
  ...overrides,
})

describe('mealPlanner', () => {
  describe('planWeek', () => {
    it('deduplicates recipes', () => {
      const recipes = [
        createRecipe({ id: '1' }),
        createRecipe({ id: '1' }),
        createRecipe({ id: '2' }),
      ]
      const result = planWeek(recipes)
      expect(result).toHaveLength(2)
    })

    it('limits to 7 days', () => {
      const recipes = Array.from({ length: 10 }, (_, i) => createRecipe({ id: String(i) }))
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
        monday: [{ ...createRecipe({ score: 10 }) }],
        tuesday: [{ ...createRecipe({ score: 8 }) }],
      }
      const score = calculatePlanScore(plan, [])
      expect(score).toBeGreaterThan(17)
    })

    it('sums recipe scores', () => {
      const plan = {
        monday: [{ ...createRecipe({ score: 10 }) }],
        tuesday: [{ ...createRecipe({ score: 8 }) }],
      }
      const score = calculatePlanScore(plan, [])
      expect(score).toBe(18)
    })
  })
})
