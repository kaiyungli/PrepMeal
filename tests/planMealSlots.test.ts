import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PLAN_MEAL_SLOT_LABELS,
  PLAN_MEAL_SLOT_ORDER,
  groupPlanItemsByMealSlot,
  mapPlanDaysByMealSlot,
  mapPlanItemMealSlot,
  mapPlanItemsByDay,
  normalizePlanMealSlot,
} from '../src/features/plans';

// /api/user/menus/[id] returns each item's slot as meal_type. The plans
// mapper turns that into the canonical mealSlot and the controller hands
// presentation per-day buckets already in display order.

type ApiItem = { id: string; date: string; meal_type?: unknown; item_order: number; recipe_id: string };

const PLAN = { week_start_date: '2026-10-05', days_count: 7 };

const apiItem = (id: string, mealType: unknown, itemOrder = 1, date = '2026-10-05'): ApiItem => ({
  id, date, meal_type: mealType, item_order: itemOrder, recipe_id: `recipe-${id}`,
});

// The controller's load path: map each item, bucket by day, then by slot.
function toView(items: ApiItem[]) {
  const mapped = items.map(mapPlanItemMealSlot);
  return mapPlanDaysByMealSlot(mapPlanItemsByDay(PLAN, mapped));
}

const ids = (groups: Array<{ mealSlot: string; items: Array<{ id: string }> }>) =>
  groups.map(({ mealSlot, items }) => [mealSlot, items.map((i) => i.id)]);

describe('normalizePlanMealSlot: API meal_type → frontend mealSlot', () => {
  it.each([
    ['breakfast', 'breakfast'], // A
    ['lunch', 'lunch'], // B
    ['dinner', 'dinner'], // C
    ['snack', 'snack'], // D
  ])('%s → %s', (mealType, mealSlot) => {
    expect(normalizePlanMealSlot(mealType)).toBe(mealSlot);
    expect(mapPlanItemMealSlot(apiItem('1', mealType)).mealSlot).toBe(mealSlot);
  });

  it('missing meal_type → other, never dinner', () => { // E
    expect(normalizePlanMealSlot(undefined)).toBe('other');
    expect(normalizePlanMealSlot(null)).toBe('other');
    expect(normalizePlanMealSlot('')).toBe('other');
    const withoutMealType: { id: string; meal_type?: unknown } = { id: '1' };
    expect(mapPlanItemMealSlot(withoutMealType).mealSlot).toBe('other');
  });

  it('unknown meal_type → other, never dinner', () => { // F
    for (const value of ['brunch', 'Dinner', ' dinner', 'supper', 42, {}]) {
      expect(normalizePlanMealSlot(value)).toBe('other');
    }
  });

  it('reads only meal_type, not the DB field meal_slot', () => {
    expect(mapPlanItemMealSlot({ meal_slot: 'lunch' } as { meal_type?: unknown }).mealSlot).toBe('other');
  });

  it('keeps every other item field', () => {
    const item = apiItem('1', 'lunch');
    expect(mapPlanItemMealSlot(item)).toEqual({ ...item, mealSlot: 'lunch' });
  });

  it('labels every canonical slot', () => {
    expect(PLAN_MEAL_SLOT_ORDER).toEqual(['breakfast', 'lunch', 'dinner', 'snack', 'other']);
    expect(PLAN_MEAL_SLOT_LABELS).toEqual({ breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '小食', other: '其他' });
  });
});

describe('meal-slot grouping', () => {
  it('puts breakfast/lunch/dinner/snack in their own buckets in display order', () => { // G
    const view = toView([apiItem('d', 'dinner'), apiItem('s', 'snack'), apiItem('l', 'lunch'), apiItem('b', 'breakfast')]);

    expect(view[0].map(({ mealSlot, label, items }) => [mealSlot, label, items.map((i) => i.id)])).toEqual([
      ['breakfast', '早餐', ['b']],
      ['lunch', '午餐', ['l']],
      ['dinner', '晚餐', ['d']],
      ['snack', '小食', ['s']],
    ]);
  });

  it('retains missing/unknown items in the other bucket, last', () => { // H
    const view = toView([apiItem('x', 'brunch'), apiItem('d', 'dinner'), apiItem('m', undefined)]);

    expect(view[0].map(({ mealSlot, label, items }) => [mealSlot, label, items.map((i) => i.id)])).toEqual([
      ['dinner', '晚餐', ['d']],
      ['other', '其他', ['x', 'm']],
    ]);
  });

  it('never drops an item', () => { // I
    const raw = [
      apiItem('1', 'breakfast'), apiItem('2', 'lunch'), apiItem('3', 'dinner'), apiItem('4', 'snack'),
      apiItem('5', 'unknown'), apiItem('6', undefined), apiItem('7', 'dinner', 1, '2026-10-06'),
      apiItem('8', null, 1, '2026-10-07'),
    ];
    const view = toView(raw);
    const rendered = Object.values(view).flatMap((groups) => groups.flatMap((g) => g.items.map((i) => i.id)));

    expect(rendered.sort()).toEqual(raw.map((i) => i.id).sort());
  });

  it('keeps several items in one slot in plan order', () => { // J
    const view = toView([apiItem('d1', 'dinner', 1), apiItem('d2', 'dinner', 2), apiItem('d3', 'dinner', 3)]);

    expect(ids(view[0])).toEqual([['dinner', ['d1', 'd2', 'd3']]]);
  });

  it('groups interleaved raw slots while keeping within-slot order', () => { // K
    // The API orders by date then item_order, and item_order restarts per slot.
    const view = toView([
      apiItem('b1', 'breakfast', 1), apiItem('l1', 'lunch', 1),
      apiItem('b2', 'breakfast', 2), apiItem('l2', 'lunch', 2),
    ]);

    expect(ids(view[0])).toEqual([
      ['breakfast', ['b1', 'b2']],
      ['lunch', ['l1', 'l2']],
    ]);
  });

  it('leaves a dinner-only Generate plan as one dinner bucket per day, in order', () => { // L
    const raw = [
      apiItem('a', 'dinner', 1, '2026-10-05'), apiItem('b', 'dinner', 2, '2026-10-05'),
      apiItem('c', 'dinner', 1, '2026-10-06'), apiItem('d', 'dinner', 1, '2026-10-08'),
    ];
    const view = toView(raw);

    expect(Object.fromEntries(Object.entries(view).map(([day, groups]) => [day, ids(groups)]))).toEqual({
      0: [['dinner', ['a', 'b']]],
      1: [['dinner', ['c']]],
      3: [['dinner', ['d']]],
    });
    expect(view[0][0].label).toBe('晚餐');
    // Day grouping itself is unchanged by the slot mapping.
    expect(mapPlanItemsByDay(PLAN, raw.map(mapPlanItemMealSlot))[0].map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('returns no buckets for a day with no items', () => {
    expect(groupPlanItemsByMealSlot([])).toEqual([]);
    expect(mapPlanDaysByMealSlot({})).toEqual({});
  });
});

// PlanDaySection and PlanRecipeCard are .js files with JSX, which this Vitest
// setup does not compile, so their contract with the feature layer is pinned
// at source level.
describe('My Plans presentation contract', () => {
  const source = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const page = source('src/pages/my-plans/[id].js');
  const daySection = source('src/components/myPlans/PlanDaySection.js');
  const recipeCard = source('src/components/myPlans/PlanRecipeCard.js');

  it('page passes the controller buckets for each day to PlanDaySection', () => {
    expect(page).toMatch(/const \{[^}]*\bmealSlotGroupsByDay,[^}]*\} = controller;/);
    expect(page).toContain('mealSlotGroups={mealSlotGroupsByDay[dayIndex] || []}');
  });

  it('PlanDaySection renders supplied buckets and does not group or read raw fields', () => {
    expect(daySection).toContain('export default function PlanDaySection({ dayIndex, mealSlotGroups, weekStartDate, onRecipeClick })');
    expect(daySection).toContain('mealSlotGroups.map(({ mealSlot, label, items }) =>');
    expect(daySection).not.toMatch(/meal_type|meal_slot|'dinner'\s*[;)]|\.forEach\(|\.filter\(/);
    expect(daySection).toMatch(/snack:\s*'.+'/);
    expect(daySection).toMatch(/other:\s*'.+'/);
  });

  it('PlanRecipeCard labels from canonical mealSlot with no dinner fallback', () => {
    expect(recipeCard).toContain("import { PLAN_MEAL_SLOT_LABELS } from '@/features/plans/mappers/mapPlanMealSlots';");
    expect(recipeCard).toContain('PLAN_MEAL_SLOT_LABELS[item.mealSlot] || PLAN_MEAL_SLOT_LABELS.other');
    expect(recipeCard).not.toMatch(/meal_type|meal_slot|'晚餐'|\|\| 'dinner'/);
  });
});
