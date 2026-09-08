/**
 * Tiny display-label helper for plan meal slots.
 *
 * Mirrors the web copy (`src/components/myPlans/PlanDaySection.jsx`,
 * `PlanRecipeCard.js`). An unrecognised slot falls back to its raw string so
 * nothing is silently hidden. Ordering of the slots (for grouping) lives in
 * `mappers/mapPlanItemsByDay.ts`, kept separate from this presentation label.
 */

const MEAL_SLOT_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

export function mealSlotLabel(slot: string | null): string | null {
  if (!slot) return null;
  return MEAL_SLOT_LABELS[slot] ?? slot;
}
