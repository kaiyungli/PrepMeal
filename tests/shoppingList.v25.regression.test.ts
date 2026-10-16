import { describe, expect, it } from 'vitest'
import { buildShoppingList, mergeIngredients } from '../src/lib/shoppingList'

const eggId = '02032659-7807-436b-b74d-779e60929489'
const sugarId = '6484e4c2-7029-41a9-afef-a9d3f04800df'

function recipe(ingredients: Array<{
  ingredient_id: string
  display_name: string
  quantity: number | null
  unit: { name: string }
  shopping_category?: string
  is_optional?: boolean
}>, base_servings = 1) {
  return { base_servings, ingredients }
}

describe('shoppingList existing contracts (v25)', () => {
  it.each([1, 2, 3, 4])('scales base_servings=1 to %i people', servings => {
    const result = buildShoppingList([recipe([
      { ingredient_id: eggId, display_name: '雞蛋', quantity: 1, unit: { name: 'pc' } },
    ])], [], servings)
    expect(result.toBuy).toHaveLength(1)
    expect(result.toBuy[0].quantity).toBe(servings)
  })

  it('merges normalized same-family unit labels', () => {
    const result = mergeIngredients([
      { ingredient_id: sugarId, name: '糖', quantity: 4, unit: 'g' },
      { ingredient_id: sugarId, name: '糖', quantity: 6, unit: 'grams' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(10)
  })

  it('keeps unknown quantities null', () => {
    const result = mergeIngredients([
      { ingredient_id: eggId, name: '雞蛋', quantity: null, unit: 'pc' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBeNull()
  })

  it('does not infer ingredient density from g and ml', () => {
    const result = mergeIngredients([
      { ingredient_id: sugarId, name: '糖', quantity: 10, unit: 'g' },
      { ingredient_id: sugarId, name: '糖', quantity: 10, unit: 'ml' },
    ])
    expect(result).toHaveLength(2)
  })

  it('excludes pantry-matched items under current name-only semantics', () => {
    const result = buildShoppingList([recipe([
      { ingredient_id: eggId, display_name: '雞蛋', quantity: 3, unit: { name: 'pc' } },
    ])], ['雞蛋'], 1)
    expect(result.toBuy).toHaveLength(0)
    expect(result.pantry).toHaveLength(1)
  })
})

describe('regressions and documented gaps', () => {
  it('excludes unselected optional recipe ingredients with explicit empty selection', () => {
    const result = buildShoppingList([recipe([
      { ingredient_id: eggId, display_name: '雞蛋', quantity: 1, unit: { name: 'pc' }, is_optional: true },
    ])], [], 1, [])
    expect(result.toBuy).toHaveLength(0)
  })

  it('includes selected optional ingredient when explicitly chosen', () => {
    const result = buildShoppingList([recipe([
      { ingredient_id: eggId, display_name: '雞蛋', quantity: 1, unit: { name: 'pc' }, is_optional: true },
    ])], [], 1, [eggId])
    expect(result.toBuy).toHaveLength(1)
    expect(result.toBuy[0].quantity).toBe(1)
  })

  it('preserves legacy optional inclusion when selection is omitted', () => {
    const result = buildShoppingList([recipe([
      { ingredient_id: eggId, display_name: '雞蛋', quantity: 1, unit: { name: 'pc' }, is_optional: true },
    ])], [], 1)
    expect(result.toBuy).toHaveLength(1)
  })

  it('merges 1 kg and 100 g into 1100 g for a single ingredient', () => {
    const result = mergeIngredients([
      { ingredient_id: sugarId, name: '糖', quantity: 1, unit: 'kg' },
      { ingredient_id: sugarId, name: '糖', quantity: 100, unit: 'g' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(1100)
    expect(result[0].unit).toBe('g')
  })
})
