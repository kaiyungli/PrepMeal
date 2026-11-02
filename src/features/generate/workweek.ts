// Reviewed against the published steps on 2026-11-02. This is a cooking-method
// shortlist, not a shelf-life or taste guarantee. Unknown recipes fail closed.
const LUNCHBOX_IDS = new Set([
  'corn-fish-rice', 'tomato-tofu-rice', 'prepmeal-batch3-04',
  'garlic-chicken-pasta', 'vegetable-egg-fried-rice', 'stir-fried-cabbage',
  'japanese-sweet-vinegar-chicken-lotus-root', 'ginger-teriyaki-chicken-meatballs',
  'miso-simmered-mackerel', 'tofu-hamburg-mixed-mushroom-sauce', 'pork-vegetable-miso-soup',
]);
export function isLunchboxCandidate(recipe: { slug?: string | null }) {
  return !!recipe.slug && LUNCHBOX_IDS.has(recipe.slug);
}
export const PLAN_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type PortionRecipe = { id?: string | number | null; slug?: string | null; name?: string };
export type PortionPlan = Record<string, (PortionRecipe | null | undefined)[]>;
export type ShoppingBatch = { label: string; recipeShares: Record<string, number> };
export function dayPortions(day: string, days: number, servings: number, packLunch = false) {
  const index = PLAN_DAYS.indexOf(day as typeof PLAN_DAYS[number]);
  return servings * (packLunch && index >= 0 && index < days - 1 ? 2 : 1);
}
export function planPortions(plan: PortionPlan, days: number, servings: number, packLunch = false) {
  return PLAN_DAYS.slice(0, days).flatMap(day => (plan[day] || []).flatMap(recipe =>
    recipe?.id ? [{ id: String(recipe.id), portions: dayPortions(day, days, servings, packLunch) }] : []));
}
export function shoppingBatches(plan: PortionPlan, days: number, servings: number, packLunch: boolean, trips: number): ShoppingBatch[] {
  if (trips !== 2) return [];
  const selected = PLAN_DAYS.slice(0, days), cut = Math.ceil(days / 2);
  const totals = new Map<string, number>();
  for (const meal of planPortions(plan, days, servings, packLunch)) totals.set(meal.id, (totals.get(meal.id) || 0) + meal.portions);
  return [selected.slice(0, cut), selected.slice(cut)].map((batch, index) => {
    const weights: Record<string, number> = {};
    for (const day of batch) for (const recipe of plan[day] || []) if (recipe?.id) {
      const id = String(recipe.id); weights[id] = (weights[id] || 0) + dayPortions(day, days, servings, packLunch) / totals.get(id)!;
    }
    return { label: `第${index + 1}批（第${selected.indexOf(batch[0]) + 1}至${selected.indexOf(batch[batch.length - 1]) + 1}日晚餐）`, recipeShares: weights };
  });
}
