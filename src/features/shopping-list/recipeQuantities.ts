import type { ShoppingListItemViewModel } from './types';
import { normalizeUnitCode } from '@/lib/formatters';

// Match fixed-ratio conversions performed by the shopping API, never density
// or weight-per-piece guesses. Progress belongs to the whole-week master row.
function family(unit?: string) {
  const code = normalizeUnitCode(unit);
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
