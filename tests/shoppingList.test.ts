import { describe, it, expect } from 'vitest'
import { mergeIngredients } from '../src/lib/shoppingList'

describe('shoppingList', () => {
  it('merges same ingredient + unit', () => {
    const list = [
      {name:'egg',quantity:3,unit:'pcs'},
      {name:'egg',quantity:2,unit:'pcs'}
    ]
    const merged = mergeIngredients(list)
    expect(merged[0].quantity).toBe(5)
  })
})