import { describe, it, expect } from 'vitest'
import { normalizeUnitCode, formatUnit } from '../src/lib/formatters'

describe('normalizeUnitCode', () => {
  describe('string input', () => {
    it('normalizes weight units', () => {
      expect(normalizeUnitCode('g')).toBe('g')
      expect(normalizeUnitCode('gram')).toBe('g')
      expect(normalizeUnitCode('grams')).toBe('g')
      expect(normalizeUnitCode('kg')).toBe('kg')
      expect(normalizeUnitCode('kilogram')).toBe('kg')
    })

    it('normalizes volume units', () => {
      expect(normalizeUnitCode('ml')).toBe('ml')
      expect(normalizeUnitCode('milliliter')).toBe('ml')
      expect(normalizeUnitCode('l')).toBe('l')
      expect(normalizeUnitCode('liter')).toBe('l')
    })

    it('normalizes cooking measure units', () => {
      expect(normalizeUnitCode('tbsp')).toBe('tbsp')
      expect(normalizeUnitCode('tablespoon')).toBe('tbsp')
      expect(normalizeUnitCode('tablespoons')).toBe('tbsp')
      expect(normalizeUnitCode('tsp')).toBe('tsp')
      expect(normalizeUnitCode('teaspoon')).toBe('tsp')
      expect(normalizeUnitCode('cup')).toBe('cup')
      expect(normalizeUnitCode('cups')).toBe('cup')
    })

    it('normalizes count units', () => {
      expect(normalizeUnitCode('pc')).toBe('pc')
      expect(normalizeUnitCode('piece')).toBe('pc')
      expect(normalizeUnitCode('pieces')).toBe('pc')
      expect(normalizeUnitCode('個')).toBe('pc')
      expect(normalizeUnitCode('clove')).toBe('clove')
      expect(normalizeUnitCode('瓣')).toBe('clove')
    })
  })

  describe('object input', () => {
    it('handles { name } shape', () => {
      expect(normalizeUnitCode({ name: 'tbsp' })).toBe('tbsp')
      expect(normalizeUnitCode({ name: 'piece' })).toBe('pc')
    })

    it('handles { code } shape', () => {
      expect(normalizeUnitCode({ code: 'g' })).toBe('g')
    })

    it('prefers code over name', () => {
      expect(normalizeUnitCode({ code: 'g', name: 'gram' })).toBe('g')
    })
  })

  describe('edge cases', () => {
    it('handles null/undefined', () => {
      expect(normalizeUnitCode(null)).toBe('')
      expect(normalizeUnitCode(undefined)).toBe('')
    })

    it('returns unknown as-is', () => {
      expect(normalizeUnitCode('unknown')).toBe('unknown')
    })
  })
})

describe('formatUnit', () => {
  it('displays weight in Chinese', () => {
    expect(formatUnit('g')).toBe('克')
    expect(formatUnit('kg')).toBe('公斤')
  })

  it('displays volume in Chinese', () => {
    expect(formatUnit('ml')).toBe('毫升')
    expect(formatUnit('l')).toBe('公升')
  })

  it('displays cooking measures in Chinese', () => {
    expect(formatUnit('tbsp')).toBe('湯匙')
    expect(formatUnit('tsp')).toBe('茶匙')
    expect(formatUnit('cup')).toBe('杯')
  })

  it('displays count in Chinese', () => {
    expect(formatUnit('pc')).toBe('個')
    expect(formatUnit('piece')).toBe('個')
  })

  it('normalizes synonyms to Chinese', () => {
    expect(formatUnit('gram')).toBe('克')
    expect(formatUnit('tablespoon')).toBe('湯匙')
    expect(formatUnit('pieces')).toBe('個')
  })

  it('handles object input', () => {
    expect(formatUnit({ name: 'tbsp' })).toBe('湯匙')
    expect(formatUnit({ code: 'g' })).toBe('克')
  })

  it('returns empty for null/undefined', () => {
    expect(formatUnit(null)).toBe('')
    expect(formatUnit(undefined)).toBe('')
  })

  it('falls back to raw for unknown', () => {
    expect(formatUnit('unknown')).toBe('unknown')
  })
})
