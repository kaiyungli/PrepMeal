import { describe, it, expect } from 'vitest'
import { normalizeIngredient } from '../src/lib/ingredientNormalizer'

describe('ingredientNormalizer', () => {
  it('normalizes 蛋 to egg', () => {
    expect(normalizeIngredient('蛋')).toBe('egg')
  })

  it('normalizes 雞蛋 to egg', () => {
    expect(normalizeIngredient('雞蛋')).toBe('egg')
  })

  it('passes through unknown ingredient', () => {
    expect(normalizeIngredient('芝士')).toBe('芝士')
  })
})