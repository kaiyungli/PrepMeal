import type { ShoppingListItemViewModel } from './types';
import { normalizeUnitCode } from '@/lib/formatters';

// Match fixed-ratio conversions performed by the shopping API, never density
// or weight-per-piece guesses. Progress belongs to the whole-week master row.
// Millilitres and spoons are one family (1 tsp = 5 ml), as in the API.
function family(unit?: string) {
  const aliases: Record<string, string> = { '克': 'g', '千克': 'kg', '公斤': 'kg', '毫升': 'ml', '公升': 'l', '茶匙': 'tsp', '湯匙': 'tbsp', '件': 'pc' };
  const code = normalizeUnitCode(aliases[unit || ''] || unit);
  if (code === 'g' || code === 'kg') return 'mass';
  if (code === 'ml' || code === 'l' || code === 'tsp' || code === 'tbsp') return 'volume';
  return code;
}

// A combined master row carries its units joined by GROUPED_UNIT_SEPARATOR.
export const GROUPED_UNIT_SEPARATOR = '+';
const families = (unit?: string) => new Set((unit || '').split(GROUPED_UNIT_SEPARATOR).map(family));

export function sameGrocery(a: ShoppingListItemViewModel, b: ShoppingListItemViewModel) {
  const identityMatches = a.ingredientId || b.ingredientId
    ? !!a.ingredientId && a.ingredientId === b.ingredientId
    : a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  if (!identityMatches) return false;
  const left = families(a.unit);
  return [...families(b.unit)].some(f => left.has(f));
}
