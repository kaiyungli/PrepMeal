import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';

// The standalone recipe page must put the full recipe (ingredients and steps)
// and the site navigation into its server HTML, and load its hero image (the
// page's LCP element) eagerly. The modal keeps its one-frame deferral and a
// lazy hero image.

vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/recipes/[id]', asPath: '/recipes/a', isFallback: false, events: { on() {}, off() {} } }) }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({
  useHeaderController: () => ({ isAuthenticated: false, loading: false, loggingOut: false,
    navLinks: [{ label: '生成餐單', path: '/generate' }], trustLinks: [],
    isActiveRoute: () => false, handleLogout() {}, onFavoritesIntent() {} }),
}));
vi.mock('@/lib/recipeStructuredData.tsx', () => ({ RecipeStructuredData: () => null }));
vi.mock('@/features/recipes', () => ({ loadRecipeDetail: vi.fn() }));
vi.mock('@/utils/perf', () => ({ measurePageLoadMetrics: () => () => {} }));

import RecipeDetail from '@/pages/recipes/[id]';
import RecipeDetailContent from '@/components/RecipeDetailContent';

const RECIPE = {
  id: 'recipe-a', slug: 'garlic-napa', name: '蒜蓉娃娃菜', description: '清甜帶蒜香', base_servings: 1,
  image_url: 'https://images.unsplash.com/photo-test',
  ingredients: [{ name: '娃娃菜', quantity: 160, unit: 'g' }],
  steps: [{ step_no: 1, text: '娃娃菜切半後瀝乾' }],
};

const heroTag = (html: string) => html.match(/<img[^>]*alt="蒜蓉娃娃菜"[^>]*>/)?.[0] ?? '';

afterEach(() => { vi.restoreAllMocks(); });

describe('Recipe detail server HTML', () => {
  it('standalone page renders ingredients, steps, site navigation and footer on the server', () => {
    const html = renderToString(<RecipeDetail recipe={RECIPE} error={null} />);
    expect(html).toContain('娃娃菜切半後瀝乾');
    expect(html).toContain('160');
    expect(html).toContain('href="/generate"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
  });

  it('standalone page loads the hero image eagerly at high priority', () => {
    const tag = heroTag(renderToString(<RecipeDetail recipe={RECIPE} error={null} />));
    expect(tag).toMatch(/fetchPriority="high"|fetchpriority="high"/i);
    expect(tag).not.toContain('loading="lazy"');
  });

  it('modal default still defers ingredients and steps and keeps a lazy hero image', () => {
    const html = renderToString(<RecipeDetailContent recipe={RECIPE} />);
    expect(html).toContain('清甜帶蒜香');
    expect(html).not.toContain('娃娃菜切半後瀝乾');
    expect(heroTag(html)).toContain('loading="lazy"');
  });
});
