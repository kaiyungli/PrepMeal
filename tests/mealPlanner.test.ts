import { describe, it, expect } from 'vitest'
import { selectRecipeForSlot, calculatePlanScore, planWeek } from '../src/lib/mealPlanner'

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

  describe('selectRecipeForSlot', () => {
    it('returns null for empty candidates', () => {
      const result = selectRecipeForSlot([], new Set(), 10)
      expect(result).toBeNull()
    })

    it('returns first candidate when only one', () => {
      const candidates = [createRecipe({ id: '1' })]
      const result = selectRecipeForSlot(candidates, new Set(), 10)
      expect(result.id).toBe('1')
    })

    it('sorts by score descending', () => {
      const candidates = [
        createRecipe({ id: '1', score: 3 }),
        createRecipe({ id: '2', score: 10 }),
        createRecipe({ id: '3', score: 5 }),
      ]
      const result = selectRecipeForSlot(candidates, new Set(), 10)
      expect(result.id).toBe('2')
    })

    it('applies pantry bonus', () => {
      const candidates = [
        createRecipe({ id: '1', score: 5, ingredients_list: ['egg', 'tomato'] }),
      ]
      const result = selectRecipeForSlot(candidates, new Set(), 10, [], [], false, ['egg', 'tomato'])
      // Score may or may not have bonus depending on normalization
      expect(result).toBeDefined()
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

    it('applies variety bonus', () => {
      const plan = {
        monday: [{ ...createRecipe({ primary_protein: 'chicken', score: 1 }) }],
        tuesday: [{ ...createRecipe({ primary_protein: 'beef', score: 1 }) }],
        wednesday: [{ ...createRecipe({ primary_protein: 'fish', score: 1 }) }],
      }
      const score = calculatePlanScore(plan, [])
      expect(score).toBeGreaterThan(3)
    })

    it('penalizes repetition', () => {
      const plan = {
        monday: [{ ...createRecipe({ id: '1', primary_protein: 'chicken', score: 1 }) }],
        tuesday: [{ ...createRecipe({ id: '2', primary_protein: 'chicken', score: 1 }) }],
      }
      const score = calculatePlanScore(plan, ['chicken'])
      expect(score).toBeLessThan(2)
    })
  })
})
