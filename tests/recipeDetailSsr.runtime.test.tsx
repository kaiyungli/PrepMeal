import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { normalizeRecipeDetail, type NormalizedRecipe } from '@/features/recipes/mappers/normalizeRecipeDetail';
import type { RecipeDetailRow } from '@/features/recipes/services/getRecipeDetail';
import { selectRelatedRecipes } from '@/features/recipes/recipeLinks';
import { loadRecipeDetail } from '@/features/recipes';
import { fetchRecipeLinkCatalog } from '@/lib/recipesServer';
import { recipeProvenance } from '@/features/recipes/mappers/recipeProvenance';

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
vi.mock('@/lib/recipesServer', () => ({ fetchRecipeLinkCatalog: vi.fn() }));
vi.mock('@/utils/perf', () => ({ measurePageLoadMetrics: () => () => {} }));

import RecipeDetail, { getStaticProps } from '@/pages/recipes/[id]';
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
  it('renders reader-facing notes and preserves source links without an editorial update date', () => {
    const provenance = recipeProvenance({
      consistency_review: { public_notes: ['圖片為AI生成示意圖。'] },
      source_attribution: { website: '參考網站', original_recipe_url: 'https://example.com/recipe',
        adaptation_note: '依批准菜式整理中文材料、用量及步驟；任何本版編定須明示。；本版保留薑汁。' },
      nutrition: { policy: '基本版不含選配。全投入估算並非實際吃下量；骨殼去除率、油鹽吸收及酒精蒸發未實測。' },
    });
    const html = renderToString(<RecipeDetail recipe={{ ...RECIPE, ...provenance }} error={null} />);
    expect(html).toContain('烹調前須知');
    expect(html).toContain('圖片為AI生成示意圖。');
    expect(html).toContain('本版保留薑汁。');
    expect(html).toContain('href="https://example.com/recipe"');
    expect(html).toContain('酒精揮發未經實測');
    expect(html).not.toMatch(/依批准|須明示|最後更新|編輯整理/);
  });
  it('keeps reviewed cold guidance and adds related links in the same server HTML after main integration', () => {
    const catalogue = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/recipe-snapshot.json', 'utf8'));
    const payload = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/payload.json', 'utf8'));
    const current = catalogue.find((recipe: { slug: string }) => recipe.slug === 'prepmeal-25-23-zaru-soba');
    const guidance = payload.find((recipe: { id: string }) => recipe.id === current.id).guidance;
    const row = { ...current, source_data: { editorial_guidance: guidance },
      ingredients: current.ingredients.map((ingredient: { note: string; optional: boolean; unit: string }) => ({ ...ingredient,
        prep_note: ingredient.note, is_optional: ingredient.optional, unit: { code: ingredient.unit, name: ingredient.unit } })),
    } as RecipeDetailRow;
    const recipe = normalizeRecipeDetail(row);
    const html = renderToString(<RecipeDetail recipe={recipe} error={null} related={selectRelatedRecipes(current, catalogue)} />);
    expect(html).toContain(guidance.cooking_tips[0]);
    expect(html).toContain('保持冷藏');
    expect(html).not.toContain('翻熱至滾燙');
    const container = document.createElement('div'); container.innerHTML = html;
    const related = container.querySelector('section[aria-labelledby="related-recipes"]')!;
    expect(related.querySelectorAll('a[href^="/recipes/"]')).toHaveLength(8);
    expect(related.querySelector(`a[href="/recipes/${current.slug}"]`)).toBeNull();
    expect(container.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`https://eatwhathk.com/recipes/${current.slug}`);
  });
  it('preserves the complete detail recipe when a catalogue fetch is unavailable', async () => {
    const recipe = { ...RECIPE, served_cold: true, cooking_tips: ['保留已核對貼士'] };
    vi.mocked(loadRecipeDetail).mockResolvedValueOnce({ recipe: recipe as unknown as NormalizedRecipe, error: null });
    vi.mocked(fetchRecipeLinkCatalog).mockResolvedValueOnce(null);
    const result = await getStaticProps({ params: { id: RECIPE.slug } });
    expect(result).toEqual({ props: { recipe, error: null, related: null }, revalidate: 300 });
  });
  it('returns notFound for an absent primary recipe even when recommendations are available', async () => {
    vi.mocked(loadRecipeDetail).mockResolvedValueOnce({ recipe: null, error: 'Recipe not found' });
    vi.mocked(fetchRecipeLinkCatalog).mockResolvedValueOnce([{ slug: 'other', name: '其他菜', meal_role: null,
      is_complete_meal: false, primary_protein: null, cuisine: null }]);
    expect(await getStaticProps({ params: { id: 'missing' } })).toEqual({ notFound: true, revalidate: 300 });
  });
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
