import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import PlanRecipeCard from '@/components/myPlans/PlanRecipeCard';
import PlanDaySection from '@/components/myPlans/PlanDaySection';
import ShoppingListSection from '@/components/myPlans/ShoppingListSection';
import { groupPlanItemsByMealSlot, mapPlanItemMealSlot } from '@/features/plans';
import { SHOPPING_LIST_LOAD_ERROR, useSavedPlanShoppingList } from '@/features/plans/hooks/useSavedPlanShoppingList';

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
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ getAccessToken: async () => 'token' }) }));

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

// /api/shopping-list skips meals whose recipe is private or missing and only
// reports how many it skipped. The saved-plan drawer must say so without
// naming them, and still show the list built from the remaining meals.
// /api/user/menus/[id] now selects calories_per_serving for each recipe.
describe('PlanRecipeCard calories', () => {
  // The card's time/calories metadata line.
  const metaLine = (container: HTMLElement) => container.querySelector('p.mt-1')?.textContent ?? null;

  it('A. shows calories_per_serving for a saved recipe', () => {
    const { container } = render(<PlanRecipeCard item={planItem('a', 'dinner', RECIPE_A)} onClick={vi.fn()} compact />);

    expect(container.textContent).toContain('10分鐘 · 320卡');
    expect(metaLine(container)).toBe('10分鐘 · 320卡');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('B. calories_per_serving %s renders without a made-up value', (_label, calories) => {
    const recipe = { ...RECIPE_A, calories_per_serving: calories } as unknown as typeof RECIPE_A;
    let container!: HTMLElement;
    expect(() => ({ container } = render(<PlanRecipeCard item={planItem('a', 'dinner', recipe)} onClick={vi.fn()} compact />))).not.toThrow();

    expect(container.textContent).toContain('番茄炒蛋');
    expect(container.textContent).toContain('10分鐘');
    expect(container.textContent).not.toMatch(/undefined|null|NaN|320/);
    expect(metaLine(container)).toBe('10分鐘');
    expect(container.textContent).not.toMatch(/卡|0卡|--/);
    expect(container.textContent).toBe('番茄炒蛋晚餐 · 2人份10分鐘→');
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('B. missing calories in Link mode still links and shows only the time', () => {
    const recipe = { ...RECIPE_A, calories_per_serving: null } as unknown as typeof RECIPE_A;
    const { container } = render(<PlanRecipeCard item={planItem('a', 'dinner', recipe)} onClick={undefined} />);

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/recipes/recipe-a');
    expect(metaLine(container)).toBe('10分鐘');
  });

  it.each([
    ['time missing', { total_time_minutes: null }, '320卡'],
    ['time and calories missing', { total_time_minutes: undefined, calories_per_serving: null }, null],
  ])('B. %s leaves no dangling label or separator', (_label, overrides, expected) => {
    const recipe = { ...RECIPE_A, ...overrides } as unknown as typeof RECIPE_A;
    const { container } = render(<PlanRecipeCard item={planItem('a', 'dinner', recipe)} onClick={vi.fn()} compact />);

    expect(metaLine(container)).toBe(expected);
    expect(container.textContent).not.toMatch(/分鐘 ·|· 卡|^卡|undefined|null/);
    expect(container.textContent).toBe(`番茄炒蛋晚餐 · 2人份${expected ?? ''}→`);
  });

  it('C. an unavailable recipe keeps the placeholder and shows no calories', () => {
    const { container } = render(<PlanRecipeCard item={planItem('m', 'dinner', 'null')} onClick={vi.fn()} compact />);

    expect(container.textContent).toBe(`🍽️${UNAVAILABLE}晚餐 · 2人份`);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });
});

describe('Saved plan shopping list with unavailable recipes', () => {
  const PARTIAL_NOTICE = (n: number) => `有 ${n} 個餐點嘅食譜已經唔再提供，購物清單未包括佢哋`;
  const ZERO_USABLE = '呢個餐單嘅食譜已經唔再提供，無法產生購物清單';
  const EMPTY = { pantry: [], toBuy: [], byRecipe: [], summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 } };
  const EGGS = { ingredientId: 'egg', name: '雞蛋', quantity: 4, unit: 'pc', category: 'egg' };
  const PARTIAL = {
    pantry: [],
    toBuy: [{ category: 'egg', items: [EGGS] }],
    byRecipe: [{ recipeId: 'recipe-a', recipeName: '番茄炒蛋', pantry: [], toBuy: [EGGS] }],
    summary: { pantryCount: 0, toBuyCount: 1, sectionCount: 1 },
  };

  async function openList(recipeIds: string[], body: unknown) {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ShoppingListSection recipeIds={recipeIds} servings={1} />);
    await act(async () => {
      fireEvent.click(screen.getByText('查看購物清單'));
    });
    await waitFor(() => expect(screen.queryByText('載入中...')).toBeNull());
    return fetchMock;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('H. a partial list shows the notice and the remaining ingredients', async () => {
    const fetchMock = await openList(['recipe-a', 'recipe-a', 'recipe-p', 'recipe-p'], { ...PARTIAL, unavailableRecipeCount: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(PARTIAL_NOTICE(2))).toBeTruthy();
    expect(screen.getByText('雞蛋')).toBeTruthy();
    expect(screen.queryByText(ZERO_USABLE)).toBeNull();

    fireEvent.click(screen.getByText('跟菜式排'));
    expect(screen.getByText('番茄炒蛋')).toBeTruthy();
    expect(screen.getByText(PARTIAL_NOTICE(2))).toBeTruthy();
  });

  it('H. zero usable recipes shows only the zero-usable message', async () => {
    await openList(['recipe-p', 'recipe-p', 'recipe-x'], { ...EMPTY, unavailableRecipeCount: 3 });

    expect(screen.getByText(ZERO_USABLE)).toBeTruthy();
    expect(screen.queryByText(/購物清單未包括佢哋/)).toBeNull();
    expect(screen.queryByText('沒有食材')).toBeNull();
  });

  it.each([
    ['unavailableRecipeCount 0', { ...PARTIAL, unavailableRecipeCount: 0 }],
    ['no unavailableRecipeCount field', PARTIAL],
  ])('H. a complete list (%s) shows no notice', async (_label, body) => {
    await openList(['recipe-a'], body);

    expect(screen.getByText('雞蛋')).toBeTruthy();
    expect(screen.queryByText(/已經唔再提供/)).toBeNull();
  });
});

describe('Saved plan shopping list request failures', () => {
  const LOAD_ERROR = '購物清單載入失敗，請重試';
  const ZERO_USABLE = '呢個餐單嘅食譜已經唔再提供，無法產生購物清單';
  const RAW_DB_ERROR = 'relation "recipe_ingredients" does not exist';
  const EGGS = { ingredientId: 'egg', name: '雞蛋', quantity: 4, unit: 'pc', category: 'egg' };
  const LIST = {
    pantry: [],
    toBuy: [{ category: 'egg', items: [EGGS] }],
    byRecipe: [{ recipeId: 'recipe-a', recipeName: '番茄炒蛋', pantry: [], toBuy: [EGGS] }],
    summary: { pantryCount: 0, toBuyCount: 1, sectionCount: 1 },
    unavailableRecipeCount: 0,
  };
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  const http500 = () => ({ ok: false, status: 500, json: async () => ({ error: RAW_DB_ERROR }) });

  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => { resolve = r; });
    return { promise, resolve };
  }

  function drawerContent() {
    return document.body.querySelector('.overflow-y-auto') as HTMLElement | null;
  }

  async function open() {
    render(<ShoppingListSection recipeIds={['recipe-a']} servings={1} />);
    await act(async () => {
      fireEvent.click(screen.getByText('查看購物清單'));
    });
    await waitFor(() => expect(screen.queryByText('載入中...')).toBeNull());
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('A. a 200 response renders the list with no error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok(LIST)));
    await open();

    expect(screen.getByText('雞蛋')).toBeTruthy();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(screen.queryByText('重試')).toBeNull();
  });

  it('C. zero usable recipes stays the zero-usable message, not a request failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ ...LIST, toBuy: [], byRecipe: [], unavailableRecipeCount: 1 })));
    await open();

    expect(screen.getByText(ZERO_USABLE)).toBeTruthy();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(screen.queryByText('重試')).toBeNull();
  });

  it('D. HTTP 500 shows the safe error with a retry action, never a blank drawer or the backend text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => http500()));
    await open();

    expect(drawerContent()?.textContent).toBe(`${LOAD_ERROR}重試`);
    expect(document.body.textContent).not.toContain(RAW_DB_ERROR);
    expect(screen.queryByText(ZERO_USABLE)).toBeNull();
  });

  it('D. an HTTP error with an unreadable body shows the same safe error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    })));
    await open();

    expect(drawerContent()?.textContent).toBe(`${LOAD_ERROR}重試`);
    expect(document.body.textContent).not.toContain('Unexpected token');
  });

  it('E. a network failure shows the safe error and does not crash', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await open();

    expect(drawerContent()?.textContent).toBe(`${LOAD_ERROR}重試`);
    expect(document.body.textContent).not.toContain('Failed to fetch');
  });

  it('G. retry issues a new request and a successful retry replaces the error with the list', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => http500())
      .mockImplementationOnce(async () => ok(LIST));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByText('重試'));
    });
    await waitFor(() => expect(screen.getByText('雞蛋')).toBeTruthy());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(screen.queryByText('重試')).toBeNull();
  });

  it('G. closing after a failure closes the drawer, and reopening retries', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => http500())
      .mockImplementationOnce(async () => ok(LIST));
    vi.stubGlobal('fetch', fetchMock);
    await open();

    await act(async () => {
      fireEvent.click(screen.getByText('✕'));
    });
    expect(drawerContent()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByText('查看購物清單'));
    });
    await waitFor(() => expect(screen.getByText('雞蛋')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('H. while a request is pending, more open/retry attempts send no second request', async () => {
    const pending = deferred<unknown>();
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => http500())
      .mockImplementationOnce(() => pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await open();

    await act(async () => {
      fireEvent.click(screen.getByText('重試'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(drawerContent()?.textContent).toBe('載入中...');
    expect(screen.queryByText('重試')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByText('✕'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('查看購物清單'));
      fireEvent.click(screen.getByText('查看購物清單'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending.resolve(ok(LIST));
    });
    await waitFor(() => expect(screen.getByText('雞蛋')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('closing a loaded list closes the drawer without a new request', async () => {
    const fetchMock = vi.fn(async () => ok(LIST));
    vi.stubGlobal('fetch', fetchMock);
    await open();

    await act(async () => {
      fireEvent.click(screen.getByText('✕'));
    });
    expect(drawerContent()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('useSavedPlanShoppingList', () => {
  const EGGS = { ingredientId: 'egg', name: '雞蛋', quantity: 4, unit: 'pc', category: 'egg' };
  const LIST = {
    pantry: [],
    toBuy: [{ category: 'egg', items: [EGGS] }],
    byRecipe: [],
    summary: { pantryCount: 0, toBuyCount: 1, sectionCount: 1 },
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('F. a failure after a success clears the earlier list instead of presenting it as current', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => ({ ok: true, status: 200, json: async () => LIST }))
      .mockImplementationOnce(async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const recipeIds = ['recipe-a'];
    const { result } = renderHook(() => useSavedPlanShoppingList({ recipeIds, servings: 1 }));

    await act(async () => { await result.current.fetchShoppingList(); });
    expect(result.current.shoppingList?.byCategory.toBuy.egg).toEqual([EGGS]);

    await act(async () => { await result.current.fetchShoppingList(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.shoppingList).toBeNull();
    expect(result.current.error).toBe(SHOPPING_LIST_LOAD_ERROR);
    expect(result.current.loading).toBe(false);
  });

  it('H. concurrent calls send one request', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => LIST }));
    vi.stubGlobal('fetch', fetchMock);
    const recipeIds = ['recipe-a'];
    const { result } = renderHook(() => useSavedPlanShoppingList({ recipeIds, servings: 1 }));

    await act(async () => {
      await Promise.all([result.current.fetchShoppingList(), result.current.fetchShoppingList()]);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.fetchShoppingList(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
