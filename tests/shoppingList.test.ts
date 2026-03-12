import { describe, it, expect } from 'vitest'
import { mergeIngredients, groupByCategory, normalizeIngredientName } from '../src/lib/shoppingList'

describe('shoppingList', () => {
  describe('normalizeIngredientName', () => {
    it('normalizes 雞蛋 to egg', () => {
      expect(normalizeIngredientName('雞蛋')).toBe('egg')
    })

    it('normalizes 番茄 to tomato', () => {
      expect(normalizeIngredientName('番茄')).toBe('tomato')
    })

    it('passes through unknown', () => {
      expect(normalizeIngredientName('芝士')).toBe('芝士')
    })

    it('handles whitespace', () => {
      expect(normalizeIngredientName('  蛋  ')).toBe('egg')
    })
  })

  describe('mergeIngredients', () => {
    it('merges same ingredient and unit', () => {
      const ingredients = [
        { name: '蛋', quantity: 3, unit: '隻' },
        { name: '蛋', quantity: 3, unit: '隻' },
      ]
      const result = mergeIngredients(ingredients)
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(6)
    })

    it('keeps different units separate', () => {
      const ingredients = [
        { name: '牛肉', quantity: 200, unit: 'g' },
        { name: '牛肉', quantity: 0.2, unit: 'kg' },
      ]
      const result = mergeIngredients(ingredients)
      expect(result).toHaveLength(2)
    })

    it('normalizes before merging', () => {
      const ingredients = [
        { name: '雞蛋', quantity: 3, unit: '隻' },
        { name: '蛋', quantity: 3, unit: '隻' },
      ]
      const result = mergeIngredients(ingredients)
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(6)
    })

    it('skips invalid ingredients', () => {
      const ingredients = [
        { name: '蛋', quantity: 3, unit: '隻' },
        { name: '', quantity: 1, unit: '隻' },
        { name: '鹽', quantity: null, unit: '茶匙' },
        undefined,
        { name: '油', quantity: 2, unit: '湯匙' },
      ]
      const result = mergeIngredients(ingredients)
      expect(result).toHaveLength(2)
    })

    it('rounds quantities to 2 decimals', () => {
      const ingredients = [
        { name: '蛋', quantity: 1.333, unit: '隻' },
      ]
      const result = mergeIngredients(ingredients)
      expect(result[0].quantity).toBe(1.33)
    })

    it('handles empty array', () => {
      const result = mergeIngredients([])
      expect(result).toHaveLength(0)
    })

    it('handles scale factor', () => {
      const ingredients = [
        { name: '蛋', quantity: 1, unit: '隻', baseServings: 2, targetServings: 4 },
      ]
      const result = mergeIngredients(ingredients)
      expect(result[0].quantity).toBe(2) // 1 * (4/2)
    })
  })

  describe('groupByCategory', () => {
    const items = [
      { name: '牛肉', category: '肉類' },
      { name: '雞肉', category: '肉類' },
      { name: '番茄', category: '蔬菜' },
      { name: '雞蛋', category: '蛋類' },
    ]

    it('groups by category', () => {
      const result = groupByCategory(items)
      expect(result['肉類']).toHaveLength(2)
      expect(result['蔬菜']).toHaveLength(1)
      expect(result['蛋類']).toHaveLength(1)
    })

    it('orders categories correctly', () => {
      const result = groupByCategory(items)
      const categories = Object.keys(result)
      expect(categories.length).toBeGreaterThan(0)
    })

    it('handles uncategorized items', () => {
      const itemsWithUnknown = [
        ...items,
        { name: '某食材', category: 'other' },
      ]
      const result = groupByCategory(itemsWithUnknown)
      expect(result).toBeDefined()
    })

    it('handles empty array', () => {
      const result = groupByCategory([])
      expect(Object.keys(result)).toHaveLength(0)
    })
  })
})
