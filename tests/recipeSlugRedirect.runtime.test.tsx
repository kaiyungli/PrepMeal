import { beforeEach, describe, expect, it, vi } from 'vitest';

// A recipe page requested by an old internal-batch slug must keep working
// before the database rename and redirect permanently after it.

const loadRecipeDetailMock = vi.hoisted(() => vi.fn());
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/recipes/[id]', asPath: '/recipes/a', isFallback: false, events: { on() {}, off() {} } }) }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({
  useHeaderController: () => ({ isAuthenticated: false, loading: false, loggingOut: false,
    navLinks: [], trustLinks: [], isActiveRoute: () => false, handleLogout() {}, onFavoritesIntent() {} }),
}));
vi.mock('@/lib/recipeStructuredData.tsx', () => ({ RecipeStructuredData: () => null }));
vi.mock('@/features/recipes', () => ({ loadRecipeDetail: loadRecipeDetailMock }));
vi.mock('@/utils/perf', () => ({ measurePageLoadMetrics: () => () => {} }));

import { getStaticProps } from '@/pages/recipes/[id]';

describe('recipe page for an old slug', () => {
  beforeEach(() => loadRecipeDetailMock.mockReset());

  it('redirects permanently to the readable URL once the old slug is gone', async () => {
    loadRecipeDetailMock.mockResolvedValue({ recipe: null, error: null });
    const result = await getStaticProps({ params: { id: 'prepmeal-25-01-nikujaga' } });
    expect(result).toEqual({ redirect: { destination: '/recipes/nikujaga', permanent: true }, revalidate: 300 });
  });

  it('still serves the recipe under the old slug before the database rename', async () => {
    loadRecipeDetailMock.mockResolvedValue({ recipe: { id: 'r', slug: 'prepmeal-25-01-nikujaga' }, error: null });
    const result = await getStaticProps({ params: { id: 'prepmeal-25-01-nikujaga' } });
    expect(result).toMatchObject({ props: { recipe: { id: 'r' } } });
  });

  it('returns 404 for unknown slugs', async () => {
    loadRecipeDetailMock.mockResolvedValue({ recipe: null, error: null });
    expect(await getStaticProps({ params: { id: 'no-such-recipe' } })).toEqual({ notFound: true, revalidate: 300 });
  });
});
