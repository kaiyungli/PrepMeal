import { describe, expect, it } from 'vitest'
import { mergeIngredients, buildShoppingList } from './shoppingList'

describe('shopping list quantity and unit integrity', () => {
  const item = (quantity: number | null, unit: string) => ({
    ingredient_id: 'fish-1', name: '魚', quantity, unit,
  })
  it('merges equivalent units', () => {
    expect(mergeIngredients([item(100, '克'), item(50, 'g')])).toMatchObject([
      { quantity: 150, unit: 'g' },
    ])
  })
  it('does not merge different units for the same ingredient', () => {
    expect(mergeIngredients([item(100, 'g'), item(2, '個')])).toMatchObject([
      { quantity: 100, unit: 'g' },
      { quantity: 2, unit: 'pc' },
    ])
  })
  it('does not turn missing, zero or invalid quantities into one', () => {
    expect(mergeIngredients([item(null, 'g'), item(0, 'g'), item(Number.NaN, 'g')])).toEqual([])
  })
  it('scales quantities by servings', () => {
    const recipes = [{ base_servings: 2, ingredients: [{
      ingredient_id: 'fish-1', display_name: '魚', quantity: 100,
      unit: { name: 'g' }, shopping_category: 'meat_seafood',
    }] }]
    expect(buildShoppingList(recipes, [], 4).toBuy).toMatchObject([{ quantity: 200, unit: 'g' }])
  })
})
