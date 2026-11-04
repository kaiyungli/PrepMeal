import { expect, it } from 'vitest';
import { groupSameIngredient, mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import { itemKey, reconcileProgress, emptyProgress } from '@/features/shopping-list/progress/model';
import type { ShoppingListResponse } from '@/features/shopping-list/types';

const item = (ingredientId: string | null, name: string, quantity: number, unit: string, unitDisplay: string) =>
  ({ ingredientId, name, normalizedName: name, quantity, unit, unitDisplay, category: 'seasoning' as const, source: 'recipe_ingredients' as const, quantityPending: false });

const response = (items: ReturnType<typeof item>[], byRecipeItems = items): ShoppingListResponse => ({
  pantry: [],
  toBuy: [{ category: 'seasoning', items }],
  byRecipe: [{ recipeId: 'r1', recipeName: '食譜', pantry: [], toBuy: byRecipeItems.map(i => ({ ...i, unit: i.unitDisplay })) }],
  summary: { pantryCount: 0, toBuyCount: items.length, sectionCount: 1 },
} as unknown as ShoppingListResponse);

it('lists one ingredient once, keeping each unit amount as written', () => {
  const view = mapShoppingListResponseToViewModel(response([
    item('soy', '生抽', 68, 'g', '克'), item('soy', '生抽', 127.5, 'ml', '毫升'), item('salt', '鹽', 9, 'g', '克'),
  ]));
  expect(view.sections[0].items).toEqual([
    { ingredientId: 'soy', name: '生抽', quantity: null, unit: 'g+ml', quantityText: '68 克 + 127.5 毫升', quantityPending: false },
    expect.objectContaining({ ingredientId: 'salt', quantity: 9, unit: 'g', quantityText: '9 克' }),
  ]);
  expect(view.summary.toBuyCount).toBe(2);
  expect(view.byRecipe[0].toBuy.map(i => i.quantityText)).toEqual(['68 克 + 127.5 毫升', '9 克']);
});

it('keeps single-unit rows and their progress keys unchanged', () => {
  const rows = [item('egg', '雞蛋', 4, 'egg', '隻')];
  const [only] = mapShoppingListResponseToViewModel(response(rows)).sections[0].items;
  expect(itemKey(only)).toBe(JSON.stringify(['egg', 'egg']));
  expect(groupSameIngredient([])).toEqual([]);
});

it('asks for a fresh check when a combined row changes', () => {
  const before = mapShoppingListResponseToViewModel(response([item('soy', '生抽', 10, 'g', '克'), item('soy', '生抽', 1, 'tsp', '茶匙')]));
  const checked = reconcileProgress(emptyProgress(), before).progress;
  checked.items[itemKey(before.sections[0].items[0])].checked = true;
  const same = reconcileProgress(checked, before);
  expect(same.changed).toEqual([]);
  expect(same.progress.items[itemKey(before.sections[0].items[0])].checked).toBe(true);
  const after = mapShoppingListResponseToViewModel(response([item('soy', '生抽', 20, 'g', '克'), item('soy', '生抽', 1, 'tsp', '茶匙')]));
  const changed = reconcileProgress(checked, after);
  expect(changed.changed).toEqual(['生抽']);
  expect(changed.progress.items[itemKey(after.sections[0].items[0])].checked).toBe(false);
});
