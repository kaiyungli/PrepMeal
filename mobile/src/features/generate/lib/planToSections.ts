/**
 * Pure `WeeklyPlan` -> `SectionList` data.
 *
 * Day order + labels + weekend flags mirror the web `WeeklyPlanGrid.DAYS`
 * (`src/components/generate/WeeklyPlanGrid.tsx`): mon..sun => 第一天..第七天,
 * Sat/Sun are weekend. The list is sliced to `daysPerWeek`. Null/undefined slot
 * entries (defensive — the preview never removes) are dropped.
 */
import type { GenerateRecipe, PlanDaySection, WeeklyPlan } from '../types.ts';

const DAYS: ReadonlyArray<{ key: string; title: string; isWeekend: boolean }> = [
  { key: 'mon', title: '第一天', isWeekend: false },
  { key: 'tue', title: '第二天', isWeekend: false },
  { key: 'wed', title: '第三天', isWeekend: false },
  { key: 'thu', title: '第四天', isWeekend: false },
  { key: 'fri', title: '第五天', isWeekend: false },
  { key: 'sat', title: '第六天', isWeekend: true },
  { key: 'sun', title: '第七天', isWeekend: true },
];

export function planToSections(
  plan: WeeklyPlan,
  daysPerWeek: number,
): PlanDaySection[] {
  const count = Math.max(0, Math.min(daysPerWeek, DAYS.length));
  return DAYS.slice(0, count).map((day) => ({
    key: day.key,
    title: day.title,
    isWeekend: day.isWeekend,
    data: (plan[day.key] ?? []).filter(
      (r): r is GenerateRecipe => r != null,
    ),
  }));
}

/** True when the plan has at least one recipe across all days. */
export function planHasRecipes(plan: WeeklyPlan): boolean {
  return Object.values(plan).some(
    (day) => Array.isArray(day) && day.some((r) => r != null),
  );
}
