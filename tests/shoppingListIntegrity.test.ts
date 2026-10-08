import { describe, expect, it } from 'vitest';
import { mergeIngredients, buildShoppingList, groupByCategory } from '../src/lib/shoppingList';

const item = (quantity: unknown, unit: string, ingredient_id = 'fish-1', name = '魚') =>
  ({ ingredient_id, name, quantity: quantity as number | null, unit });

const recipeWith = (base_servings: number | undefined, ingredients: object[]) => ({ base_servings, ingredients });
const ing = (ingredient_id: string, display_name: string, quantity: number | null, unit: string | null, shopping_category = 'meat_seafood') =>
  ({ ingredient_id, display_name, quantity, unit: unit ? { name: unit } : null, shopping_category });

describe('shopping list unit compatibility', () => {
  it('merges equivalent units of one ingredient', () => {
    expect(mergeIngredients([item(100, '克'), item(50, 'g'), item(25, 'G')])).toEqual([
      expect.objectContaining({ ingredient_id: 'fish-1', quantity: 175, unit: 'g' }),
    ]);
  });

  it('never combines incompatible units of one ingredient', () => {
    expect(mergeIngredients([item(100, 'g'), item(2, '個'), item(1, 'kg')])).toEqual([
      expect.objectContaining({ quantity: 100, unit: 'g' }),
      expect.objectContaining({ quantity: 2, unit: 'pc' }),
      expect.objectContaining({ quantity: 1, unit: 'kg' }),
    ]);
  });

  it('never combines different ingredients that share a unit', () => {
    expect(mergeIngredients([item(100, 'g', 'fish-1'), item(100, 'g', 'pork-1', '豬')])).toHaveLength(2);
  });
});

describe('shopping list invalid quantities', () => {
  it('lists missing or zero amounts without inventing a quantity', () => {
    expect(mergeIngredients([item(null, 'g'), item(undefined, 'tsp'), item(0, '個')])).toEqual([
      expect.objectContaining({ quantity: null, unit: 'g' }),
      expect.objectContaining({ quantity: null, unit: 'tsp' }),
      expect.objectContaining({ quantity: null, unit: 'pc' }),
    ]);
  });

  it('skips corrupt amounts: NaN, non-numeric text, negative, infinite', () => {
    expect(mergeIngredients([
      item(Number.NaN, 'g'), item('abc', 'g'), item(-5, 'g'), item(Number.POSITIVE_INFINITY, 'g'),
    ])).toEqual([]);
  });

  it('sums known amounts and ignores unknown ones for the same ingredient and unit', () => {
    expect(mergeIngredients([item(null, 'g'), item(100, 'g'), item(0, 'g'), item('50', 'g')])).toEqual([
      expect.objectContaining({ quantity: 150, unit: 'g' }),
    ]);
  });
});

describe('shopping list serving scaling', () => {
  it('scales by target servings over recipe base servings', () => {
    const list = buildShoppingList([recipeWith(2, [ing('fish-1', '魚', 100, 'g')])], [], 4);
    expect(list.toBuy).toEqual([expect.objectContaining({ quantity: 200, unit: 'g' })]);
  });

  it('treats a missing or zero base serving as one serving', () => {
    const list = buildShoppingList([
      recipeWith(undefined, [ing('fish-1', '魚', 100, 'g')]),
      recipeWith(0, [ing('pork-1', '豬', 50, 'g')]),
    ], [], 3);
    expect(list.toBuy.map(i => i.quantity)).toEqual([300, 150]);
  });

  it('does not scale by a non-positive or non-numeric serving count', () => {
    for (const servings of [0, -2, Number.NaN]) {
      const list = buildShoppingList([recipeWith(2, [ing('fish-1', '魚', 100, 'g')])], [], servings);
      expect(list.toBuy).toEqual([expect.objectContaining({ quantity: 100 })]);
    }
  });

  it('keeps an ingredient without an amount when scaling', () => {
    const list = buildShoppingList([recipeWith(1, [ing('salt-1', '鹽', null, null, 'seasoning')])], [], 4);
    expect(list.toBuy).toEqual([expect.objectContaining({ name: '鹽', quantity: null })]);
  });

  it('applies merge-level scaling only with valid serving counts', () => {
    expect(mergeIngredients([{ ...item(1, 'g'), baseServings: 2, targetServings: 6 }])[0].quantity).toBe(3);
    expect(mergeIngredients([{ ...item(1, 'g'), baseServings: 0, targetServings: 6 }])[0].quantity).toBe(1);
  });

  it('adds a recipe planned twice twice', () => {
    const r = recipeWith(1, [ing('fish-1', '魚', 100, 'g')]);
    expect(buildShoppingList([r, r], [], 1).toBuy).toEqual([expect.objectContaining({ quantity: 200 })]);
  });
});

describe('shopping list pantry classification and grouping', () => {
  const recipes = [recipeWith(1, [
    ing('egg-1', '雞蛋', 2, '個', 'egg_dairy'),
    ing('egg-1', '雞蛋', 50, 'g', 'egg_dairy'),
    ing('fish-1', '魚', 100, 'g'),
  ])];

  it('classifies pantry items by normalized name and lists each pantry ingredient once', () => {
    const list = buildShoppingList(recipes, ['蛋'], 1);
    expect(list.pantry).toEqual([{ name: '雞蛋' }]);
    expect(list.toBuy.map(i => i.ingredient_id)).toEqual(['fish-1']);
  });

  it('puts everything in to-buy without a pantry', () => {
    expect(buildShoppingList(recipes, [], 1).toBuy).toHaveLength(3);
  });

  it('groups merged items by category, unit-split lines included, and never drops unknown categories', () => {
    const grouped = groupByCategory(buildShoppingList([recipeWith(1, [
      ing('egg-1', '雞蛋', 2, '個', '蛋類'),
      ing('egg-1', '雞蛋', 50, 'g', '蛋類'),
      ing('fish-1', '魚', 100, 'g', '海鮮'),
      ing('salt-1', '鹽', 1, 'tsp', 'seasoning'),
      ing('oil-1', '油', 1, 'tbsp', '其他'),
    ])], [], 1).toBuy);
    expect(Object.fromEntries(Object.entries(grouped).map(([cat, items]) => [cat, items.map(i => `${i.ingredient_id}:${i.unit}`)])))
      .toEqual({
        '海鮮': ['fish-1:g'],
        '蛋類': ['egg-1:pc', 'egg-1:g'],
        '其他': ['salt-1:tsp', 'oil-1:tbsp'],
      });
  });
});
