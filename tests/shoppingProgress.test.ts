import { describe, it, expect } from 'vitest';
import { emptyProgress, itemKey, reconcileProgress, shoppingText, validProgress } from '@/features/shopping-list/progress/model';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse } from '@/features/shopping-list/types';
const view = (quantity: number | null, unit = 'g') => mapShoppingListResponseToViewModel({ pantry: [], toBuy: [{ category: 'meat', items: [{ ingredientId: 'chicken', name: '雞肉', normalizedName: 'chicken', quantity, unit, category: 'meat', source: 'recipe_ingredients', quantityPending: quantity === null }] }], byRecipe: [], summary: { pantryCount: 0, toBuyCount: 1, sectionCount: 1 } } as ShoppingListResponse);
const bought = () => {
  const p = reconcileProgress(emptyProgress(), view(200)).progress;
  const key = itemKey(view(200).sections[0].items[0]);
  p.items[key].checked = true; p.items[key].note = '街市';
  p.extras.push({ id: 'x', name: '紙巾', quantity: '2', unit: '包', note: '', checked: false });
  return p;
};
describe('shopping progress reconciliation', () => {
  it('preserves unchanged/decreased quantities and notes, unchecks increases', () => {
    const p = bought(); const key = Object.keys(p.items)[0];
    expect(reconcileProgress(p, view(100)).progress.items[key].checked).toBe(true);
    expect(reconcileProgress(p, view(200)).progress.items[key].checked).toBe(true);
    const result = reconcileProgress(p, view(400));
    expect(result.progress.items[key]).toMatchObject({ checked: false, note: '街市', quantity: 400 });
    expect(result.changed).toEqual(['雞肉']);
  });
  it('unchecks a changed unit, preserves extras and removes unused recipe ingredients', () => {
    const result = reconcileProgress(bought(), view(2, 'kg'));
    expect(Object.values(result.progress.items)[0].checked).toBe(false);
    expect(result.changed).toEqual(['雞肉']);
    const removed = reconcileProgress(bought(), { ...view(1), sections: [] });
    expect(removed.progress.items).toEqual({}); expect(removed.progress.extras[0].name).toBe('紙巾');
  });
  it('keeps the same ingredient in incompatible units as separate checklist entries', () => {
    const v = view(100); v.sections[0].items.push({ ...view(2, 'piece').sections[0].items[0] });
    expect(Object.keys(reconcileProgress(emptyProgress(), v).progress.items)).toHaveLength(2);
  });
  it('shares remaining by default and all with bought markers and notes', () => {
    expect(shoppingText(view(200), bought(), false)).not.toContain('雞肉');
    expect(shoppingText(view(200), bought(), false)).toContain('紙巾');
    expect(shoppingText(view(200), bought(), true)).toContain('☑ 雞肉 200 g — 街市');
  });
  it('bounds untrusted data before browser restore and server writes', () => {
    expect(validProgress(bought())).toBe(true);
    expect(validProgress({ ...bought(), extras: [{ id: 'x' }] })).toBe(false);
    expect(validProgress({ ...bought(), items: { a: { checked: true, note: 'x'.repeat(301), quantity: 1, unit: 'g', quantityText: '1g' } } })).toBe(false);
  });
});
