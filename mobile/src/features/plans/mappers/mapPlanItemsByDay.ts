/**
 * Pure grouping mapper: a flat list of normalized plan items → deterministic
 * day buckets.
 *
 * Ordering contract (all deterministic, no locale / no `Date` parsing):
 *   - Day buckets are ordered by ISO `date` ascending. `YYYY-MM-DD` sorts
 *     lexicographically === chronologically, so a plain string sort suffices.
 *   - Items with a missing / blank date collect into a single trailing bucket
 *     whose `date` is `null`.
 *   - Within a day: meal slot first (breakfast → lunch → dinner → anything
 *     else / none), then `item_order` ascending (a missing order counts as 0),
 *     then original input index as a stable final tiebreak. `item_order`
 *     restarts per (date, meal_slot) group in the DB, so sorting on it alone
 *     would interleave slots — hence the slot rank leads.
 *   - Every optional field is tolerated as `null` / missing.
 *
 * Neither the input array nor its item objects are mutated.
 *
 * Zero value imports (type-only import is erased by `--experimental-strip-types`)
 * — unit-tested directly by `node --test`.
 */
import type { PlanDay, PlanItem } from '../types';

const MEAL_SLOT_RANK: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
};

/** Rank used only for ordering; unknown / missing slots sort last but stable. */
function mealSlotRank(slot: string | null | undefined): number {
  if (typeof slot === 'string' && slot in MEAL_SLOT_RANK) {
    return MEAL_SLOT_RANK[slot];
  }
  return 3;
}

/** Sorts after every real `YYYY-MM-DD` key. */
const NULL_DATE_KEY = '￿';

export function mapPlanItemsByDay(
  items: readonly PlanItem[] | null | undefined,
): PlanDay[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const buckets = new Map<string, { item: PlanItem; index: number }[]>();

  items.forEach((item, index) => {
    const rawDate =
      item && typeof item.date === 'string' ? item.date.trim() : '';
    const key = rawDate === '' ? NULL_DATE_KEY : rawDate;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push({ item, index });
    } else {
      buckets.set(key, [{ item, index }]);
    }
  });

  return [...buckets.keys()]
    .sort()
    .map((key) => {
      const entries = buckets.get(key)!;
      const sorted = [...entries]
        .sort((a, b) => {
          const slotDelta =
            mealSlotRank(a.item.meal_slot) - mealSlotRank(b.item.meal_slot);
          if (slotDelta !== 0) return slotDelta;
          const orderDelta =
            (a.item.item_order ?? 0) - (b.item.item_order ?? 0);
          if (orderDelta !== 0) return orderDelta;
          return a.index - b.index;
        })
        .map((entry) => entry.item);
      return { date: key === NULL_DATE_KEY ? null : key, items: sorted };
    });
}
