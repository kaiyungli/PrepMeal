/**
 * The part of the weekly plan the grid shows: the first `daysPerWeek` days and
 * the first `dishesPerDay` slots of each. Plan state can be larger after the
 * user reduces days or switches composition without regenerating; save and
 * the shopping list must act on what the user sees, never on hidden recipes.
 * Slot positions (including empty slots) are kept.
 */
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function getVisiblePlan<T>(
  weeklyPlan: Record<string, T[]>,
  daysPerWeek: number,
  dishesPerDay: number
): Record<string, T[]> {
  const visible: Record<string, T[]> = {};
  for (const day of DAY_ORDER.slice(0, daysPerWeek)) {
    if (Array.isArray(weeklyPlan[day])) visible[day] = weeklyPlan[day].slice(0, dishesPerDay);
  }
  return visible;
}
