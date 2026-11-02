import type { ShoppingListItemViewModel, ShoppingListViewModel } from './types';
import { formatQuantityDisplay } from './types';
import type { ShoppingBatch } from '@/features/generate/workweek';
export function canonicalUnit(unit = '') {
  return ({ '克':'g', '千克':'kg', '毫升':'ml', '公升':'l', '茶匙':'tsp', '湯匙':'tbsp', '瓣':'clove', '隻':'egg' } as Record<string,string>)[unit] || unit;
}
function measure(unit = '') {
  const u = canonicalUnit(unit);
  return ({g:['g',1],kg:['g',1000],ml:['ml',1],l:['ml',1000],tsp:['tsp',1],tbsp:['tsp',3]} as Record<string,[string,number]>)[u] || [u,1] as [string,number];
}
// Identity first, with a name fallback only for legacy payloads lacking IDs.
export function sameGrocery(a: Partial<ShoppingListItemViewModel>, b: Partial<ShoppingListItemViewModel>) {
  return (a.ingredientId && b.ingredientId ? a.ingredientId === b.ingredientId : a.name === b.name) && measure(a.unit)[0] === measure(b.unit)[0];
}
export function batchQuantities(view: ShoppingListViewModel, batch: ShoppingBatch) {
  const rows = new Map<string, ShoppingListItemViewModel>();
  for (const recipe of view.byRecipe) {
    const share = recipe.recipeId ? batch.recipeShares[recipe.recipeId] : 0;
    if (!share) continue;
    for (const item of recipe.toBuy) {
      const [unit, multiplier] = measure(item.unit);
      const key = JSON.stringify([item.ingredientId || item.name, unit]);
      const existing = rows.get(key);
      const unknown = item.quantityPending || item.quantity == null || !Number.isFinite(item.quantity);
      const quantity = unknown ? null : item.quantity! * multiplier * share;
      const combinedUnknown = unknown || existing?.quantityPending === true;
      const total = combinedUnknown ? null : (existing?.quantity || 0) + quantity!;
      const label = ({g:'克',ml:'毫升',tsp:'茶匙',clove:'瓣',egg:'隻'} as Record<string,string>)[unit] || unit;
      rows.set(key, { ingredientId: item.ingredientId || null, name: item.name, quantity: total, unit,
        quantityPending: combinedUnknown, quantityText: formatQuantityDisplay(total, label, combinedUnknown) });
    }
  }
  return [...rows.values()];
}
