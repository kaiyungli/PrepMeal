import type { SavedPlanShoppingList } from './hooks/useSavedPlanShoppingList';
import { OFFLINE_TTL } from '@/features/shopping-list/progress/offlineStore';
export function readShoppingCache(raw: string | null, scope: string, now = Date.now()): SavedPlanShoppingList | null {
  if (!raw || raw.length > 1000000) return null;
  try {
    const v = JSON.parse(raw), list = v.list;
    const text = (x: unknown) => typeof x === 'string' && x.length <= 1000;
    const rows = (x: unknown) => Array.isArray(x) && x.length <= 1000 && x.every(i => i && text(i.name) &&
      (i.unit == null || text(i.unit)) && (i.ingredientId == null || text(i.ingredientId)) &&
      (i.quantity == null || (typeof i.quantity === 'number' && Number.isFinite(i.quantity) && i.quantity >= 0)));
    if (v.version !== 1 || v.scope !== scope || !Number.isFinite(v.savedAt) || v.savedAt > now || now - v.savedAt >= OFFLINE_TTL ||
      !list || !rows(list.byCategory?.pantry) || !list.byCategory?.toBuy || Array.isArray(list.byCategory.toBuy) ||
      Object.keys(list.byCategory.toBuy).length > 20 || !Object.values(list.byCategory.toBuy).every(rows) ||
      !Array.isArray(list.byRecipe) || list.byRecipe.length > 200 || list.byRecipe.some((r: { recipeName: unknown; pantry: unknown; toBuy: unknown }) => !text(r.recipeName) || !rows(r.pantry) || !rows(r.toBuy)) ||
      typeof list.noUsableRecipes !== 'boolean' || (list.notice !== null && !text(list.notice)) ||
      (list.dietaryNotes !== undefined && (!Array.isArray(list.dietaryNotes) || !list.dietaryNotes.every(text))) ||
      (list.optionalIngredients !== undefined && (!Array.isArray(list.optionalIngredients) || list.optionalIngredients.length > 200 ||
        list.optionalIngredients.some((g: { recipeId: unknown; recipeName: unknown; ingredients: unknown }) => !text(g.recipeId) || !text(g.recipeName) || !Array.isArray(g.ingredients) || g.ingredients.length > 500 || g.ingredients.some(i => !i || !text(i.name) || !text(i.ingredientId)))))) return null;
    return list;
  } catch { return null; }
}
