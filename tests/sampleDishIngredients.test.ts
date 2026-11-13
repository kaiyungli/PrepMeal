import { describe, expect, it } from 'vitest';
import { sampleDishIngredients } from '@/features/guides/samplePlanIngredients';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse, ShoppingListBuyItem, ShoppingCategoryKey } from '@/features/shopping-list/types';
const buy = (ingredientId: string, name: string, quantity: number, unit: string, category: ShoppingCategoryKey): ShoppingListBuyItem => ({ ingredientId, name, normalizedName: name, quantity, unit, category, source: 'recipe_ingredients', quantityPending: false });
const response = (): ShoppingListResponse => ({ pantry: [], summary: { pantryCount: 0, toBuyCount: 3, sectionCount: 2 },
  toBuy: [{ category: 'meat', items: [buy('chicken', '雞肉', 900, 'g', 'meat'), buy('fish', '魚柳', 800, 'g', 'meat')] },
    { category: 'vegetable', items: [buy('pepper', '青椒', 600, 'g', 'vegetable'), buy('garlic', '蒜頭', 20, 'clove', 'vegetable')] }],
  byRecipe: [{ recipeId: 'hero', recipeName: '雞丁', pantry: [], toBuy: [{ ingredientId: 'chicken', name: '雞肉', quantity: 300, unit: '克' }, { ingredientId: 'pepper', name: '青椒', quantity: 80, unit: '克' }, { ingredientId: 'garlic', name: '蒜頭', quantity: 2, unit: '瓣' }] },
    { recipeId: 'other', recipeName: '蒸魚', pantry: [], toBuy: [{ ingredientId: 'fish', name: '魚柳', quantity: 360, unit: '克' }] }],
});
describe('hero excerpts use serving-scaled per-recipe results', () => {
  it('never uses the weekly quantity or an ingredient belonging to a different recipe', () => {
    const view = mapShoppingListResponseToViewModel(response());
    expect(sampleDishIngredients('hero', view)).toEqual([{ name: '雞肉', quantityText: '300 克' }, { name: '青椒', quantityText: '80 克' }]);
    expect(sampleDishIngredients('other', view)).toEqual([{ name: '魚柳', quantityText: '360 克' }]);
  });
  it('hides missing/unknown quantities and does not fill with another recipe or pantry names', () => {
    const data = response(); data.byRecipe[0].toBuy.forEach(item => { item.quantity = null; item.quantityPending = true; });
    const view = mapShoppingListResponseToViewModel(data);
    expect(sampleDishIngredients('hero', view)).toEqual([]); expect(sampleDishIngredients('missing', view)).toEqual([]);
  });
  it('allows one known ingredient without inventing a second', () => {
    const data = response(); data.byRecipe[0].toBuy = data.byRecipe[0].toBuy.slice(0, 1);
    expect(sampleDishIngredients('hero', mapShoppingListResponseToViewModel(data))).toEqual([{ name: '雞肉', quantityText: '300 克' }]);
  });
});
