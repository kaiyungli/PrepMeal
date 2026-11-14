import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRedirectStatus } from 'next/dist/lib/redirect-status';
import { RECIPE_SLUG_RENAMES } from '@/constants/recipeSlugRenames';

const loadRecipeDetailMock = vi.hoisted(() => vi.fn());
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/recipes/[id]', asPath: '/recipes/a', isFallback: false, events: { on() {}, off() {} } }) }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({
  useHeaderController: () => ({ isAuthenticated: false, loading: false, loggingOut: false,
    navLinks: [], trustLinks: [], isActiveRoute: () => false, handleLogout() {}, onFavoritesIntent() {} }),
}));
vi.mock('@/lib/recipeStructuredData.tsx', () => ({ RecipeStructuredData: () => null }));
vi.mock('@/features/recipes', () => ({ loadRecipeDetail: loadRecipeDetailMock }));
vi.mock('@/lib/recipesServer', () => ({ fetchRecipeLinkCatalog: vi.fn().mockResolvedValue(null) }));
vi.mock('@/utils/perf', () => ({ measurePageLoadMetrics: () => () => {} }));

import { getStaticProps } from '@/pages/recipes/[id]';
const missing = { recipe: null, error: 'Recipe not found' };
const notFound = { notFound: true, revalidate: 300 };
const oldSlug = 'prepmeal-25-01-nikujaga';
const target = { recipe: { id: 'r', slug: 'nikujaga' }, error: null };

describe('recipe page for an old slug', () => {
  beforeEach(() => loadRecipeDetailMock.mockReset());

  it('redirects all 100 old slugs with Next HTTP 308 only after confirming their exact public target', async () => {
    for (const [from, to] of Object.entries(RECIPE_SLUG_RENAMES)) {
      loadRecipeDetailMock.mockReset().mockResolvedValueOnce(missing)
        .mockResolvedValueOnce({ recipe: { id: 'r', slug: to }, error: null });
      const result = await getStaticProps({ params: { id: from } });
      expect(result).toEqual({ redirect: { destination: `/recipes/${encodeURIComponent(to)}`, permanent: true }, revalidate: 300 });
      expect(getRedirectStatus(result.redirect!)).toBe(308);
      expect(loadRecipeDetailMock.mock.calls.map(([slug]) => slug)).toEqual([from, to]);
    }
  });

  it('serves the old slug unchanged before the database rename, without a target query', async () => {
    loadRecipeDetailMock.mockResolvedValue({ recipe: { id: 'r', slug: oldSlug }, error: null });
    const result = await getStaticProps({ params: { id: oldSlug } });
    expect(result).toMatchObject({ props: { recipe: { id: 'r', slug: oldSlug } } });
    expect(loadRecipeDetailMock).toHaveBeenCalledTimes(1);
  });

  it.each(['no-such-recipe', 'constructor', 'toString', '__proto__', '../nikujaga', '%2Fnikujaga'])('does not redirect unknown or unsafe key %s', async id => {
    loadRecipeDetailMock.mockResolvedValue(missing);
    expect(await getStaticProps({ params: { id } })).toEqual(notFound);
    expect(loadRecipeDetailMock).toHaveBeenCalledTimes(1);
  });

  it.each(['Recipe fetch failed', 'Supabase is not configured', null])('does not turn an unconfirmed source failure into a permanent redirect: %s', async error => {
    loadRecipeDetailMock.mockResolvedValueOnce({ recipe: null, error }).mockResolvedValueOnce(target);
    expect(await getStaticProps({ params: { id: oldSlug } })).toEqual(notFound);
    expect(loadRecipeDetailMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    missing, { recipe: null, error: 'Recipe fetch failed' },
    { recipe: { id: 'r', slug: 'wrong-target' }, error: null },
    { recipe: { id: 'r', slug: 'nikujaga' }, error: 'Recipe fetch failed' },
  ])('never permanently redirects to a missing, private, failed or mismatched target', async result => {
    loadRecipeDetailMock.mockResolvedValueOnce(missing).mockResolvedValueOnce(result);
    expect(await getStaticProps({ params: { id: oldSlug } })).toEqual(notFound);
    expect(loadRecipeDetailMock).toHaveBeenCalledTimes(2);
  });
});
