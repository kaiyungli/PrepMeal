/**
 * Plan meal-slot contract
 *
 * The DB stores menu_plan_items.meal_slot and /api/user/menus/[id] returns it
 * as meal_type. Everything past this mapper reads only the canonical mealSlot.
 *
 * Missing or unknown values become 'other' so they are neither dropped nor
 * passed off as dinner.
 */

export type PlanMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

// Display order of the slot buckets within a day.
export const PLAN_MEAL_SLOT_ORDER: readonly PlanMealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export const PLAN_MEAL_SLOT_LABELS: Record<PlanMealSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '小食',
  other: '其他',
};

const KNOWN_SLOTS = new Set<string>(['breakfast', 'lunch', 'dinner', 'snack']);

export function normalizePlanMealSlot(mealType: unknown): PlanMealSlot {
  return typeof mealType === 'string' && KNOWN_SLOTS.has(mealType)
    ? (mealType as PlanMealSlot)
    : 'other';
}

/**
 * Attach the canonical mealSlot to an API plan item (reads meal_type only).
 */
export function mapPlanItemMealSlot<T extends { meal_type?: unknown }>(item: T): T & { mealSlot: PlanMealSlot } {
  return { ...item, mealSlot: normalizePlanMealSlot(item.meal_type) };
}

export interface PlanMealSlotGroup<T> {
  mealSlot: PlanMealSlot;
  label: string;
  items: T[];
}

/**
 * Bucket one day's items by mealSlot in PLAN_MEAL_SLOT_ORDER.
 * Items keep their loaded (item_order) order within a bucket; empty buckets are omitted.
 */
export function groupPlanItemsByMealSlot<T extends { mealSlot: PlanMealSlot }>(items: T[]): PlanMealSlotGroup<T>[] {
  const buckets = new Map<PlanMealSlot, T[]>(PLAN_MEAL_SLOT_ORDER.map((slot) => [slot, []]));
  for (const item of items) {
    // A slot outside the union (e.g. from untyped JS) still lands in 'other'.
    (buckets.get(item.mealSlot) ?? buckets.get('other')!).push(item);
  }
  return PLAN_MEAL_SLOT_ORDER
    .filter((slot) => buckets.get(slot)!.length > 0)
    .map((slot) => ({ mealSlot: slot, label: PLAN_MEAL_SLOT_LABELS[slot], items: buckets.get(slot)! }));
}

/**
 * Apply groupPlanItemsByMealSlot to every day of mapPlanItemsByDay output.
 */
export function mapPlanDaysByMealSlot<T extends { mealSlot: PlanMealSlot }>(
  itemsByDay: Record<number, T[]>
): Record<number, PlanMealSlotGroup<T>[]> {
  const result: Record<number, PlanMealSlotGroup<T>[]> = {};
  for (const [day, items] of Object.entries(itemsByDay)) {
    result[Number(day)] = groupPlanItemsByMealSlot(items);
  }
  return result;
}
