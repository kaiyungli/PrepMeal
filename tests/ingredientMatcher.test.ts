import { describe, it, expect } from 'vitest'
import { scoreRecipe } from '../src/lib/ingredientMatcher'

describe('ingredientMatcher', () => {
  it('gives higher score for better match', () => {
    const pantry = ['egg','tomato']
    const recipe = ['egg','tomato','oil','salt']
    const score = scoreRecipe(pantry, recipe)
    expect(score).toBeGreaterThan(0.4)
  })
})