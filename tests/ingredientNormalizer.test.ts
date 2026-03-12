import { describe, it, expect } from 'vitest'
import { 
  normalizeIngredient, 
  normalizeIngredients,
  getCanonicalIngredients,
  findMatchingCanonical,
  INGREDIENT_SYNONYMS
} from '../src/lib/ingredientNormalizer'

describe('ingredientNormalizer', () => {
  // Basic normalization
  it('normalizes 蛋 to egg', () => {
    expect(normalizeIngredient('蛋')).toBe('egg')
  })

  it('normalizes 雞蛋 to egg', () => {
    expect(normalizeIngredient('雞蛋')).toBe('egg')
  })

  it('passes through unknown ingredient', () => {
    expect(normalizeIngredient('芝士')).toBe('芝士')
  })

  // Case insensitive
  it('handles uppercase input', () => {
    expect(normalizeIngredient('EGG')).toBe('egg')
  })

  it('handles mixed case input', () => {
    expect(normalizeIngredient('Tomato')).toBe('tomato')
  })

  it('handles whitespace trimming', () => {
    expect(normalizeIngredient('  蛋  ')).toBe('egg')
  })

  // Plural handling
  it('normalizes eggs to egg', () => {
    expect(normalizeIngredient('eggs')).toBe('egg')
  })

  it('normalizes tomatoes to tomato', () => {
    expect(normalizeIngredient('tomatoes')).toBe('tomato')
  })

  // Chinese variations
  it('normalizes 番茄 to tomato', () => {
    expect(normalizeIngredient('番茄')).toBe('tomato')
  })

  it('normalizes 蕃茄 to tomato', () => {
    expect(normalizeIngredient('蕃茄')).toBe('tomato')
  })

  it('normalizes 蝦 to shrimp', () => {
    expect(normalizeIngredient('蝦')).toBe('shrimp')
  })

  it('normalizes 蝦仁 to shrimp', () => {
    expect(normalizeIngredient('蝦仁')).toBe('shrimp')
  })

  it('normalizes 牛肉 to beef', () => {
    expect(normalizeIngredient('牛肉')).toBe('beef')
  })

  it('normalizes 豬肉 to pork', () => {
    expect(normalizeIngredient('豬肉')).toBe('pork')
  })

  it('normalizes 雞肉 to chicken', () => {
    expect(normalizeIngredient('雞肉')).toBe('chicken')
  })

  // normalizeIngredients
  it('normalizes array of ingredients', () => {
    const result = normalizeIngredients(['蛋', '番茄', '牛肉'])
    expect(result).toEqual(['egg', 'tomato', 'beef'])
  })

  it('handles empty array', () => {
    expect(normalizeIngredients([])).toEqual([])
  })

  it('handles array with unknowns', () => {
    const result = normalizeIngredients(['蛋', '芝士'])
    expect(result).toEqual(['egg', '芝士'])
  })

  // getCanonicalIngredients
  it('extracts unique canonical ingredients', () => {
    const result = getCanonicalIngredients(['蛋', '雞蛋', '番茄'])
    expect(result).toContain('egg')
    expect(result).toContain('tomato')
  })

  it('removes duplicates', () => {
    const result = getCanonicalIngredients(['蛋', '蛋', '蛋'])
    expect(result).toEqual(['egg'])
  })

  // findMatchingCanonical
  it('finds matching canonical ingredients', () => {
    const { matched, missing } = findMatchingCanonical(
      ['蛋', '牛肉'],
      ['蛋', '番茄', '鹽']
    )
    expect(matched).toContain('egg')
    expect(missing).toContain('tomato')
  })

  it('returns all missing when no match', () => {
    const { matched, missing } = findMatchingCanonical(
      ['牛肉'],
      ['蛋', '番茄']
    )
    expect(matched).toHaveLength(0)
    expect(missing).toHaveLength(2)
  })

  it('handles empty user ingredients', () => {
    const { matched, missing } = findMatchingCanonical([], ['蛋'])
    expect(matched).toHaveLength(0)
  })

  // Synonym map integrity
  it('has egg synonyms', () => {
    expect(INGREDIENT_SYNONYMS.egg).toContain('蛋')
    expect(INGREDIENT_SYNONYMS.egg).toContain('雞蛋')
  })

  it('has tomato synonyms', () => {
    expect(INGREDIENT_SYNONYMS.tomato).toContain('番茄')
    expect(INGREDIENT_SYNONYMS.tomato).toContain('蕃茄')
  })
})
