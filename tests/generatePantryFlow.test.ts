import { describe, it, expect } from 'vitest'

/**
 * Tests for pantry → generate flow integration
 */

// Simulate the parsing logic from generate.js
function parsePantryFromQuery(ingredientsParam: string | string[] | undefined): string[] {
  if (!ingredientsParam) return []
  
  const ingredients = Array.isArray(ingredientsParam)
    ? ingredientsParam
    : ingredientsParam.split(',')
  
  return ingredients
    .map(i => i.trim())
    .filter(Boolean)
}

// Simulate the query generation from PantryHero
function generateIngredientsQuery(chips: string[]): string {
  return chips.join(',')
}

describe('Pantry → Generate Flow Integration', () => {
  describe('parsePantryFromQuery', () => {
    it('parses comma-separated string', () => {
      const result = parsePantryFromQuery('egg,tomato')
      expect(result).toEqual(['egg', 'tomato'])
    })

    it('parses array of ingredients', () => {
      const result = parsePantryFromQuery(['egg', 'tomato'])
      expect(result).toEqual(['egg', 'tomato'])
    })

    it('handles undefined', () => {
      const result = parsePantryFromQuery(undefined)
      expect(result).toEqual([])
    })

    it('handles empty string', () => {
      const result = parsePantryFromQuery('')
      expect(result).toEqual([])
    })

    it('trims whitespace', () => {
      const result = parsePantryFromQuery(' egg , tomato ')
      expect(result).toEqual(['egg', 'tomato'])
    })

    it('filters empty values', () => {
      const result = parsePantryFromQuery('egg,,tomato')
      expect(result).toEqual(['egg', 'tomato'])
    })

    it('handles single ingredient', () => {
      const result = parsePantryFromQuery('egg')
      expect(result).toEqual(['egg'])
    })
  })

  describe('generateIngredientsQuery', () => {
    it('generates comma-separated query', () => {
      const result = generateIngredientsQuery(['egg', 'tomato', 'onion'])
      expect(result).toEqual('egg,tomato,onion')
    })

    it('handles empty array', () => {
      const result = generateIngredientsQuery([])
      expect(result).toEqual('')
    })

    it('handles single ingredient', () => {
      const result = generateIngredientsQuery(['egg'])
      expect(result).toEqual('egg')
    })
  })

  describe('End-to-end flow', () => {
    it('round-trip: chips → query → parse', () => {
      const chips = ['egg', 'tomato', 'onion']
      const query = generateIngredientsQuery(chips)
      const parsed = parsePantryFromQuery(query)
      
      expect(parsed).toEqual(chips)
    })

    it('generates valid URL parameter', () => {
      const chips = ['egg', 'tomato']
      const query = generateIngredientsQuery(chips)
      const url = `/generate?ingredients=${encodeURIComponent(query)}`
      
      expect(url).toBe('/generate?ingredients=egg%2Ctomato')
    })

    it('URL can be decoded back', () => {
      const url = '/generate?ingredients=egg%2Ctomato'
      const params = new URLSearchParams(url.split('?')[1])
      const decoded = decodeURIComponent(params.get('ingredients') || '')
      const parsed = parsePantryFromQuery(decoded)
      
      expect(parsed).toEqual(['egg', 'tomato'])
    })
  })

  describe('Helper text logic', () => {
    it('shows helper when pantry has ingredients', () => {
      const pantry = parsePantryFromQuery('egg,tomato')
      const shouldShowHelper = pantry.length > 0
      
      expect(shouldShowHelper).toBe(true)
    })

    it('hides helper when pantry is empty', () => {
      const pantry = parsePantryFromQuery(undefined)
      const shouldShowHelper = pantry.length > 0
      
      expect(shouldShowHelper).toBe(false)
    })
  })
})
