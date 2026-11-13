import type { ShoppingListViewModel } from '@/features/shopping-list/types';
import type { SamplePlanDish } from './samplePlan';

const PRIORITY: Record<string, number> = { meat: 0, seafood: 0, tofu_egg: 1, vegetable: 2, carb: 3, dairy: 4, frozen: 5 };
const AROMATICS = /^(蒜頭|蒜蓉|蒜|薑|生薑|蔥|葱)$/;

/** Quantities come only from this recipe's existing, serving-scaled calculation.
 * The merged sections supply category metadata, never their weekly quantities. */
export function sampleDishIngredients(recipeId: string, view: ShoppingListViewModel): NonNullable<SamplePlanDish['ingredientExcerpt']> {
  const group = view.byRecipe.find(recipe => String(recipe.recipeId) === recipeId);
  if (!group) return [];
  const categories = new Map(view.sections.flatMap(section => section.items.map(item =>
    [item.ingredientId ?? item.name, section.categoryKey] as const)));
  const byName = new Map(view.sections.flatMap(section => section.items.map(item => [item.name, section.categoryKey] as const)));
  const category = (item: typeof group.toBuy[number]) => categories.get(item.ingredientId ?? item.name) ?? byName.get(item.name);
  return group.toBuy.filter(item => {
    const key = category(item);
    return key !== undefined && Object.hasOwn(PRIORITY, key) && !AROMATICS.test(item.name)
      && !item.quantityPending && typeof item.quantity === 'number' && Number.isFinite(item.quantity)
      && item.quantity >= 0 && !!item.unit?.trim() && !!item.name.trim() && !!item.quantityText.trim();
  }).sort((a, b) => PRIORITY[category(a)!] - PRIORITY[category(b)!]).slice(0, 2)
    .map(({ name, quantityText }) => ({ name, quantityText }));
}
