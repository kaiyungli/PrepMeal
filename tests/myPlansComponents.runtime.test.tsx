import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import PlanRecipeCard from '@/components/myPlans/PlanRecipeCard';
import PlanDaySection from '@/components/myPlans/PlanDaySection';
import { groupPlanItemsByMealSlot, mapPlanItemMealSlot } from '@/features/plans';

// Runtime render tests for the My Plans .js components (run via
// vitest.components.config.ts; see `npm run test:components`).
//
// A saved plan item can outlive its recipe lookup: /api/user/menus/[id] reads
// recipes through RLS, so a recipe that is no longer public comes back as
// recipe: null (lookup returned nothing) or with no recipe key at all
// (lookup omitted that id). That item must render a neutral, non-clickable
// card instead of throwing and taking the whole page down.

const { prefetchRecipeDetail } = vi.hoisted(() => ({ prefetchRecipeDetail: vi.fn() }));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => ({ prefetchRecipeDetail }));

const UNAVAILABLE = '此食譜暫時無法查看';
const RECIPE_A = { id: 'recipe-a', name: '番茄炒蛋', image_url: 'https://img.example/a.jpg', total_time_minutes: 10, calories_per_serving: 320, difficulty: 'easy', method: 'stir_fry' };
const RECIPE_B = { id: 'recipe-b', name: '蒸豆腐', image_url: null, total_time_minutes: 15, calories_per_serving: 180, difficulty: 'easy', method: 'steam' };

type Recipe = typeof RECIPE_A | typeof RECIPE_B;
type Missing = 'null' | 'undefined' | 'absent';

// An item as usePlanDetailController hands it to presentation.
function planItem(id: string, mealType: string, recipe: Recipe | Missing, servings = 2) {
  const base = { id, date: '2026-10-05', day_index: 0, meal_type: mealType, recipe_id: `rid-${id}`, servings, item_order: 1, source: 'generated' };
  if (recipe === 'absent') return mapPlanItemMealSlot(base);
  return mapPlanItemMealSlot({ ...base, recipe: recipe === 'null' ? null : recipe === 'undefined' ? undefined : recipe });
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  prefetchRecipeDetail.mockReset();
});

describe('PlanRecipeCard with a missing recipe', () => {
  it.each([
    ['A. recipe = null', 'null'],
    ['B. recipe = undefined', 'undefined'],
    ['C. recipe key absent', 'absent'],
  ] as const)('%s renders the fallback instead of throwing', (_label, missing) => {
    for (const onClick of [undefined, vi.fn()]) {
      expect(() => render(<PlanRecipeCard item={planItem('m', 'dinner', missing)} onClick={onClick} compact />)).not.toThrow();
      expect(screen.getByText(UNAVAILABLE)).toBeTruthy();
      cleanup();
    }
  });

  it('D. shows the meal label, servings and neutral unavailable copy', () => {
    const { container } = render(<PlanRecipeCard item={planItem('m', 'breakfast', 'absent', 3)} onClick={undefined} compact />);

    expect(container.textContent).toContain(UNAVAILABLE);
    expect(container.textContent).toContain('早餐 · 3人份');
    expect(container.textContent).not.toMatch(/刪除|私人|不完整|未知食譜/);
  });

  it('E. is not clickable: no button, no link, no onClick, no prefetch', () => {
    const onClick = vi.fn();
    const { container } = render(<PlanRecipeCard item={planItem('m', 'dinner', 'null')} onClick={onClick} compact />);

    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    const card = container.firstElementChild as HTMLElement;
    fireEvent.click(card);
    fireEvent.mouseEnter(card);
    fireEvent.focus(card);
    fireEvent.touchStart(card);
    expect(onClick).not.toHaveBeenCalled();
    expect(prefetchRecipeDetail).not.toHaveBeenCalled();
  });
});

describe('PlanRecipeCard with a valid recipe (unchanged)', () => {
  it('F. Link mode links to the recipe and shows image, name, time/calories, label and servings', () => {
    const { container } = render(<PlanRecipeCard item={planItem('v', 'dinner', RECIPE_A)} onClick={undefined} />);

    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/recipes/recipe-a');
    expect(link?.className).toBe('block group');
    expect(container.querySelector('button')).toBeNull();
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe(RECIPE_A.image_url);
    expect(img?.getAttribute('alt')).toBe('番茄炒蛋');
    expect(img?.className).toContain('w-14 h-14');
    expect(container.textContent).toBe('番茄炒蛋晚餐 · 2人份10分鐘 · 320卡→');
  });

  it('F. Link mode without an image shows the placeholder', () => {
    const { container } = render(<PlanRecipeCard item={planItem('v', 'lunch', RECIPE_B)} onClick={undefined} compact />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/recipes/recipe-b');
    expect(container.textContent).toBe('🍽️蒸豆腐午餐 · 2人份15分鐘 · 180卡→');
    expect(container.querySelector('.w-10.h-10')).not.toBeNull();
  });

  it('G. onClick mode renders a button that calls onClick and prefetches on hover/focus/touch', () => {
    const onClick = vi.fn();
    const { container } = render(<PlanRecipeCard item={planItem('v', 'dinner', RECIPE_A)} onClick={onClick} compact />);

    expect(container.querySelector('a')).toBeNull();
    const button = screen.getByRole('button');
    expect(button.className).toBe('w-full text-left cursor-pointer');
    expect(button.textContent).toBe('番茄炒蛋晚餐 · 2人份10分鐘 · 320卡→');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.mouseEnter(button);
    fireEvent.focus(button);
    fireEvent.touchStart(button);
    expect(prefetchRecipeDetail.mock.calls).toEqual([['recipe-a'], ['recipe-a'], ['recipe-a']]);
  });
});

describe('PlanDaySection with a missing recipe', () => {
  function renderDay(items: ReturnType<typeof planItem>[], onRecipeClick = vi.fn()) {
    const groups = groupPlanItemsByMealSlot(items);
    const view = render(<PlanDaySection dayIndex={0} mealSlotGroups={groups} weekStartDate="2026-10-05" onRecipeClick={onRecipeClick} />);
    return { ...view, onRecipeClick };
  }

  // A slot bucket is the <div> wrapping its "<icon> <label>" heading.
  const bucket = (label: string) => screen.getByText((_, el) => el?.tagName === 'P' && !!el.textContent?.endsWith(` ${label}`)).parentElement as HTMLElement;

  it('H. valid / missing / valid: no throw, all three cards render, valid siblings stay usable', () => {
    const { container, onRecipeClick } = renderDay([
      planItem('v1', 'dinner', RECIPE_A), planItem('m', 'dinner', 'absent'), planItem('v2', 'dinner', RECIPE_B),
    ]);

    const dinner = bucket('晚餐');
    const cards = dinner.querySelector('.space-y-2')!.children;
    expect([...cards].map((c) => c.textContent)).toEqual([
      '番茄炒蛋晚餐 · 2人份10分鐘 · 320卡→',
      `🍽️${UNAVAILABLE}晚餐 · 2人份`,
      '🍽️蒸豆腐晚餐 · 2人份15分鐘 · 180卡→',
    ]);
    const buttons = within(dinner).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => fireEvent.click(b));
    expect(onRecipeClick.mock.calls).toEqual([['recipe-a'], ['recipe-b']]);
    expect(container.textContent).toContain('第一天');
  });

  it.each([
    ['breakfast', '早餐'],
    ['dinner', '晚餐'],
    ['snack', '小食'],
    ['not-a-slot', '其他'],
  ])('I. a missing recipe saved as %s stays in the %s section', (mealType, label) => {
    renderDay([planItem('v', 'lunch', RECIPE_A), planItem('m', mealType, 'null')]);

    const section = bucket(label);
    expect(within(section).getByText(UNAVAILABLE)).toBeTruthy();
    expect(section.textContent).toContain(`${label} · 2人份`);
    expect(within(bucket('午餐')).queryByText(UNAVAILABLE)).toBeNull();
  });
});
