import type { ShoppingListItemViewModel } from './types';
import { normalizeUnitCode } from '@/lib/formatters';

// Match fixed-ratio conversions performed by the shopping API, never density
// or weight-per-piece guesses. Progress belongs to the whole-week master row.
function family(unit?: string) {
  const aliases: Record<string, string> = { '克': 'g', '千克': 'kg', '公斤': 'kg', '毫升': 'ml', '公升': 'l', '茶匙': 'tsp', '湯匙': 'tbsp', '件': 'pc' };
  const code = normalizeUnitCode(aliases[unit || ''] || unit);
  if (code === 'g' || code === 'kg') return 'mass';
  if (code === 'ml' || code === 'l') return 'volume';
  if (code === 'tsp' || code === 'tbsp') return 'spoons';
  return code;
}
export function sameGrocery(a: ShoppingListItemViewModel, b: ShoppingListItemViewModel) {
  const identityMatches = a.ingredientId || b.ingredientId
    ? !!a.ingredientId && a.ingredientId === b.ingredientId
    : a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  return identityMatches && family(a.unit) === family(b.unit);
}
