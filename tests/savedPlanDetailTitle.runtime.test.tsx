import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';

// The saved plan detail page builds its <title> from the plan name. React 19
// renders a <title> whose children are an array (e.g. {name} followed by
// literal text) as an empty title, so the name and the site suffix must reach
// <title> as one string.
//
// next/head is replaced by a pass-through so React's own <title> handling is
// what renders here. Auth, router, header, the recipe detail cache and the
// recipe modal are stubbed; the plan controller, its mappers and the day
// sections are real, with fetch answering GET /api/user/menus/:id.

const PLAN_ID = '00000000-0000-4000-8000-000000000001';

const { authGuard } = vi.hoisted(() => ({
  authGuard: {
    isAuthenticated: true,
    loading: false,
    user: { id: 'user-1' },
    getAccessToken: async () => 'token-1',
  },
}));
vi.mock('@/hooks/useAuthGuard', () => ({ useAuthGuard: () => authGuard }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ getAccessToken: async () => 'token-1' }) }));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => ({
  prefetchRecipeDetail: () => undefined,
  getCachedRecipeDetail: () => null,
  setCachedRecipeDetail: () => undefined,
  getInflightRecipeDetail: () => null,
}));
vi.mock('next/router', () => ({ useRouter: () => ({ query: { id: '00000000-0000-4000-8000-000000000001' } }) }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({ useHeaderController: () => ({}) }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('next/link', () => ({ default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => <a href={href} className={className}>{children}</a> }));
vi.mock('@/components/RecipeDetailModal', () => ({
  default: ({ isOpen, recipe }: { isOpen: boolean; recipe: { name?: string } | null }) =>
    isOpen ? <div role="dialog">{recipe?.name}</div> : null,
}));

import PlanDetailPage from '@/pages/my-plans/[id]';

const PLAN = { id: PLAN_ID, name: '我的一週餐單', week_start_date: '2026-10-05', days_count: 2 };
const ITEMS = [
  { id: 'item-1', recipe_id: 'recipe-a', date: '2026-10-05', meal_type: 'dinner', servings: 2, recipe: { id: 'recipe-a', name: '番茄炒蛋' } },
  { id: 'item-2', recipe_id: 'recipe-b', date: '2026-10-06', meal_type: 'lunch', servings: 2, recipe: { id: 'recipe-b', name: '蒸水蛋' } },
];

type MenuResponse = { status: number; body: unknown };

function stubPlanFetch(response: MenuResponse | Promise<never>) {
  const fetchMock = vi.fn((url: string) => {
    if (url === `/api/user/menus/${PLAN_ID}`) {
      if (response instanceof Promise) return response;
      return Promise.resolve(new Response(JSON.stringify(response.body), { status: response.status }));
    }
    return new Promise<Response>(() => {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function titleText() {
  const titles = document.querySelectorAll('title');
  expect(titles).toHaveLength(1);
  return titles[0].textContent;
}

beforeEach(() => {
  authGuard.isAuthenticated = true;
  authGuard.loading = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Saved plan detail page title', () => {
  it('A/B/C. a loaded plan renders a non-empty title with its name and the site suffix', async () => {
    stubPlanFetch({ status: 200, body: { success: true, data: { plan: PLAN, items: ITEMS } } });
    render(<PlanDetailPage />);

    expect(await screen.findByRole('heading', { name: '我的一週餐單' })).toBeTruthy();
    expect(titleText()).toBe('我的一週餐單 - 今晚食乜');
  });

  it('A/C. server rendering emits a single-string title with the fallback name while loading', () => {
    stubPlanFetch(new Promise<never>(() => {}));
    const html = renderToString(<PlanDetailPage />);

    expect(html).toContain('<title>餐單詳情 - 今晚食乜</title>');
  });

  it('D. while the plan is loading the page shows the loading state with the fallback title', () => {
    stubPlanFetch(new Promise<never>(() => {}));
    render(<PlanDetailPage />);

    expect(screen.getByText('載入中...')).toBeTruthy();
    expect(titleText()).toBe('餐單詳情 - 今晚食乜');
  });

  it('D. a failed load shows the error with the fallback title', async () => {
    stubPlanFetch({ status: 500, body: { success: false, error: '載入餐單失敗' } });
    render(<PlanDetailPage />);

    expect(await screen.findByText('載入餐單失敗')).toBeTruthy();
    expect(titleText()).toBe('餐單詳情 - 今晚食乜');
  });

  it('D. a missing plan shows the not-found message with the fallback title', async () => {
    stubPlanFetch({ status: 200, body: { success: true, data: { plan: null, items: [] } } });
    render(<PlanDetailPage />);

    expect(await screen.findByText('搵唔到呢個餐單')).toBeTruthy();
    expect(titleText()).toBe('餐單詳情 - 今晚食乜');
  });

  it('D. while auth is resolving the page shows loading without a title', () => {
    authGuard.loading = true;
    const fetchMock = stubPlanFetch(new Promise<never>(() => {}));
    render(<PlanDetailPage />);

    expect(screen.getByText('載入中...')).toBeTruthy();
    expect(document.querySelector('title')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('E. the loaded plan still renders its days, meal slots and recipes and opens a recipe', async () => {
    const fetchMock = stubPlanFetch({ status: 200, body: { success: true, data: { plan: PLAN, items: ITEMS } } });
    render(<PlanDetailPage />);

    expect(await screen.findByText('番茄炒蛋')).toBeTruthy();
    expect(screen.getByText('2天')).toBeTruthy();
    expect(screen.getByText('第一天')).toBeTruthy();
    expect(screen.getByText('第二天')).toBeTruthy();
    expect(screen.getByText('蒸水蛋')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(`/api/user/menus/${PLAN_ID}`, { headers: { Authorization: 'Bearer token-1' } });

    fireEvent.click(screen.getByText('番茄炒蛋'));
    await waitFor(() => expect(screen.getByRole('dialog').textContent).toBe('番茄炒蛋'));
  });
});
