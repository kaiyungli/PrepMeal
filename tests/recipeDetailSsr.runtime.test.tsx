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
import { PairingSuggestion } from '@/components/recipes/RecipeLinkSections';

const RECIPE = {
  id: 'recipe-a', slug: 'garlic-napa', name: '蒜蓉娃娃菜', description: '清甜帶蒜香', base_servings: 1,
  image_url: 'https://images.unsplash.com/photo-test',
  ingredients: [{ name: '娃娃菜', quantity: 160, unit: 'g' }],
  steps: [{ step_no: 1, text: '娃娃菜切半後瀝乾' }],
};

const heroTag = (html: string) => html.match(/<img[^>]*alt="蒜蓉娃娃菜"[^>]*>/)?.[0] ?? '';

afterEach(() => { vi.restoreAllMocks(); });

describe('Recipe detail server HTML', () => {
  it.each((JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/recipe-snapshot.json', 'utf8')) as { id: string }[]).map(r => r.id))('renders consistent dynamic pairings for recipe %s', (id) => {
    const catalogue = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/recipe-snapshot.json', 'utf8'));
    const payload = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/payload.json', 'utf8'));
    const patch = payload.find((entry: { id: string }) => entry.id === id);
    const guidance = patch.guidance;
    const target = structuredClone(catalogue.find((recipe: { id: string }) => recipe.id === id));
    Object.assign(target, patch.recipe_updates);
    for (const step of patch.changed_steps) target.steps.find((s: { step_no: number }) => s.step_no === step.step_no).text = step.text;
    for (const change of patch.ingredient_changes) {
      target.ingredients = target.ingredients.filter((ingredient: { id: string }) => ingredient.id !== change.new.id);
      target.ingredients.push(change.new);
    }
    const current = { ...target,
      ingredients: target.ingredients.map((i: { note: string; optional: boolean }) => ({ ...i, prep_note: i.note, is_optional: i.optional })),
      cooking_tips: guidance.cooking_tips, pairing_suggestions: guidance.pairing_suggestions };
    const original = JSON.stringify(current);
    const related = selectRelatedRecipes(current, catalogue);
    const html = renderToString(<RecipeDetail recipe={current} related={related} error={null} />);
    const container = document.createElement('div'); container.innerHTML = html;
    const heading = [...container.querySelectorAll('h3')].find(el => el.textContent?.includes('配搭建議'))!;
    const section = heading.parentElement!;
    const hrefs = [...section.querySelectorAll('a')].map(a => a.getAttribute('href'));
    const expected = related.pairWith.map(target => `/recipes/${encodeURIComponent(target.slug)}`);
    expect(hrefs).toEqual(expected);
    for (const target of related.pairWith) expect(section.textContent).toContain(target.name);
    const relatedLinks = [...container.querySelector('#related-recipes')!.parentElement!.querySelectorAll('a')];
    expect(relatedLinks.slice(0, expected.length).map(a => a.getAttribute('href'))).toEqual(expected);
    expect(html).not.toContain('本頁的湯不是另外的飯量');
    if (current.slug === 'beef-chow-fun') {
      expect(html).toContain('牛肉回鑊炒至全熟，河粉熱透，即可上碟。');
    }
    if (current.slug === 'luncheon-meat-scrambled-egg') {
      expect(html).toContain('蛋液完全凝固後立即上碟，避免久炒。');
      expect(html).toContain('午餐肉已有鹹味，毋須另加鹽；雞蛋完全凝固後才上碟。');
    }
    if (current.slug === 'pumpkin-soup') {
      expect(html).toContain('最後加入材料表的鹽及黑胡椒調味。');
    }
    if (current.slug === 'prepmeal-batch4-22') {
      expect(html).toContain('米用約1000毫升水浸20分鐘瀝乾；同時雞絲拌生抽、糖、粟粉、紹酒及1/4茶匙油，雪櫃醃20分鐘。南瓜切1厘米粒、冬菇切片、蒜蔥切碎。');
    }
    if (current.slug === 'tuna-corn-baked-potato') {
      expect(html).toContain('吞拿魚瀝乾，與粟米粒和材料表的黑胡椒拌勻。');
    }
    if (current.slug === 'tuna-tofu-egg-pancake') {
      expect(html).toContain('平底鑊加入材料表的食油，中小火加熱。');
      expect(html).toContain('吞拿魚與豆腐先瀝乾，餅糊才較容易定形；生粉按材料表用量加入。');
    }
    if (current.slug === 'miso-baked-fish-fillet') {
      expect(html).toContain('魚柳用廚紙抹乾備用。');
    }
    if (current.slug === 'omelette') {
      expect(html).toContain('雞蛋打入碗中，加入牛奶及材料表的鹽和黑胡椒，打至蛋白蛋黃完全混合。');
    }
    if (current.slug === 'steamed-beef-tofu-baby-napa-rice') {
      expect(html).toContain('用乾淨食物溫度計檢查最厚或重疊處的牛肉，中心達75°C並維持至少30秒。牛肉熟透後及時取出，避免久蒸變韌。');
      expect(html).toContain('將蒸菜、豆腐、牛肉及盤汁配熟飯食用。');
    }
    if (current.slug === 'cumin-spicy-baked-tofu') {
      expect(html).toContain('取出盛碟，不另淋油。');
    }
    if (current.slug === 'prepmeal-batch3-11') {
      expect(html).toContain('焗爐預熱180°C；雞件抹乾，不清洗生雞。薯仔切約3厘米角，雞件與薯仔在深焗盤單層排好。');
    }
    if (current.slug === 'prepmeal-batch2-23') {
      expect(html).toContain('使用普通美式黃芥末醬；芥末籽醬或辣芥末味道不同，不宜直接按相同份量替代。');
    }
    if (current.slug === 'tomato-fish-fillet-soup-xhs') {
      expect(html).toContain('先從350毫升水中取少量煮番茄，再加入餘下的水煮湯。');
      expect(html).not.toContain('兩段用水合共350毫升');
      expect(html).not.toContain('前段少量炒番茄');
    }
    if (current.slug === 'steamed-fish') {
      expect(html).toContain('確認魚柳最厚處中心熟透');
      expect(html).not.toContain('魚肉變白並容易分開後取出');
    }
    if (current.slug === 'scallion-omelette-xhs') expect(html).toContain('中心蛋液完全凝固');
    if (current.slug === 'borscht-style-beef-vegetable-soup') {
      expect(html).toContain('最後加入材料表的鹽及黑胡椒調味。');
      expect(html).not.toContain('鹽少許和黑胡椒少許');
    }
    if (current.slug === 'prepmeal-batch3-16') {
      expect(html).toContain('豉油、糖及約8毫升水');
      expect(html).not.toContain('豉油、糖及材料表的清水');
    }
    if (current.slug === 'stir-fried-gai-lan-xhs') {
      expect(html).toContain('糖屬選配，可先試味再決定是否加入');
      expect(html).not.toContain('無限加糖');
    }
    if (current.slug === 'garlic-lettuce') expect(html).toContain('鑊內太乾時才逐少加入選配水，最多20毫升');
    if (current.slug === 'black-pepper-beef-xhs') {
      expect(html).toContain('材料表的全部生粉');
      expect(html).toContain('生粉全部用來醃肉');
      expect(html).not.toContain('生抽、生粉與黑胡椒先分出');
    }
    if (current.slug === 'tofu-egg-pancake') {
      expect(html).toContain('豆腐須在拌入蛋液前瀝乾');
      expect(html).toContain('材料表的鹽');
      expect(html).toContain('材料表的食油');
      expect(html).toContain('食物中心達75°C並維持至少30秒後上碟');
      expect(html).not.toContain('拌勻後的蛋糊可直接下鑊');
    }
    if (current.slug === 'pan-fried-salmon') expect(html).toContain('平底鑊加入材料表的橄欖油，中火加熱。');
    if (current.slug === 'lemon-butter-fish-fillet') {
      expect(html).toContain('材料表的鹽及部分黑胡椒');
      expect(html).toContain('加入檸檬汁及餘下黑胡椒');
      expect(html).toContain('如選用蒜頭');
    }
    if (current.slug === 'tomato-egg-tofu-pot') {
      expect(html).toContain('材料表的食油，中火炒番茄約2分鐘');
      expect(html).toContain('蛋液完全凝固後關火');
      expect(html).toContain('加入豆腐和 2 湯匙水');
    }
    if (current.slug === 'minced-pork-potato') {
      expect(html).not.toContain('不另加鹽、白胡椒或未列出的醃料');
      expect(html).toContain('一茶匙半油分兩次使用');
      expect(html).toContain('豬肉完全熟透、薯仔軟熟');
    }
    if (current.slug === 'shrimp-egg-tofu-pot') expect(html).toContain('先取15毫升水拌入蛋液，餘下30毫升用來煮豆腐和蝦仁');
    if (current.slug === 'fermented-beancurd-water-spinach') expect(html).toContain('腐乳已有鹹味，毋須再加鹽或生抽');
    if (current.slug === 'preserved-radish-omelette') {
      expect(html).toContain('菜脯已有鹹味，毋須另加鹽');
      expect(html).toContain('確認中心蛋液全熟才上碟');
    }
    if (current.slug === 'teriyaki-salmon') {
      expect(html).toContain('三文魚熟透後盛起，按需要另配白飯。');
      expect(html).not.toContain('可配 180 克白飯食用');
    }
    if (current.slug === 'celery-lily-stir-fry') expect(html).toContain('鑊中加入食油1茶匙及蒜片，中火炒香。');
    if (current.slug === 'beef-onion-stir-fry') {
      expect(html).toContain('冷藏醃約10分鐘');
      expect(html).toContain('餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒');
      expect(html).toContain('中心達75°C並維持至少30秒');
      expect(html).not.toContain('本版不加入');
      expect(html).not.toContain('本版不額外加入');
    }
    expect(JSON.stringify(current)).toBe(original);
  });
  it('ignores stale named database pairings when the catalogue is unavailable', () => {
    const current = { ...RECIPE, meal_role: 'veg_side', pairing_suggestions: ['可配已下架菜式。'] };
    const html = renderToString(<RecipeDetail recipe={current} related={null} error={null} />);
    expect(html).not.toContain('已下架菜式');
    expect(html).toContain('可搭配豆腐、蛋、魚或肉類主菜');
  });
  it('keeps plain copy when the public catalogue is unavailable', () => {
    const text = '可配蒜蓉西蘭花及白飯。';
    const html = renderToString(<PairingSuggestion text={text} />);
    expect(html).toBe(text);
  });
  it('treats dish names as literal text and escapes URL path segments', () => {
    const text = '可配菜式（A）及菜式A+B；菜式A+B。';
    const html = renderToString(<PairingSuggestion text={text} recipes={[
      { name: '菜式A+B', slug: 'a/b' }, { name: '菜式（A）', slug: 'a' },
    ]} />);
    const container = document.createElement('div'); container.innerHTML = html;
    expect(container.textContent).toBe(text);
    expect([...container.querySelectorAll('a')].map(a => a.getAttribute('href')))
      .toEqual(['/recipes/a', '/recipes/a%2Fb', '/recipes/a%2Fb']);
  });
  it.each([
    [0, '0'], [1.25, '1.25'], [null, '-'], [undefined, '-'],
    [-1, '-'], [Number.NaN, '-'], [Number.POSITIVE_INFINITY, '-'],
  ])('renders carbohydrate and fat value %s consistently', (value, expected) => {
    const html = renderToString(<RecipeDetailContent
      recipe={{ ...RECIPE, carbs_g: value, fat_g: value }} deferHeavySections={false} />);
    const container = document.createElement('div'); container.innerHTML = html;
    for (const label of ['碳水(g)', '脂肪(g)']) {
      const caption = [...container.querySelectorAll('div')].find(el => el.textContent === label)!;
      expect(caption.previousElementSibling?.textContent).toBe(expected);
    }
  });
  it('renders reader-facing preparation and both step shapes without altering raw data', () => {
    const recipe = { ...RECIPE,
      ingredients: [{ name: '蒜頭', quantity: 1, unit: 'clove', prep_note: '去皮淨重，切碎；本次重新訂定用量' }],
      steps: ['加入水120毫升及鹽1/8茶匙，攪拌均勻；本版不另改蛋水比例。',
        { step_no: 2, text: '如水分不足，須補少量水並記錄實際用量，不能乾燒。' }],
    };
    const original = JSON.stringify(recipe);
    const html = renderToString(<RecipeDetailContent recipe={recipe} deferHeavySections={false} />);
    expect(html).toContain('去皮淨重，切碎');
    expect(html).toContain('加入水120毫升及鹽1/8茶匙，攪拌均勻。');
    expect(html).toContain('如水分不足，逐少補水，不能乾燒。');
    expect(html).not.toMatch(/本次重新訂定用量|本版不另改蛋水比例|記錄實際用量/);
    expect(JSON.stringify(recipe)).toBe(original);
  });
  it('clarifies count-based egg preparation while preserving gram-based notes and quantities', () => {
    const recipe = { ...RECIPE, ingredients: [
      { name: '雞蛋', quantity: 1, unit: { code: 'egg' }, prep_note: '去殼蛋液重量，約1隻' },
      { name: '蛋液', quantity: 50, unit: { code: 'g' }, prep_note: '去殼蛋液重量，約1隻' },
    ] };
    const original = JSON.stringify(recipe);
    const html = renderToString(<RecipeDetailContent recipe={recipe} deferHeavySections={false} />);
    const container = document.createElement('div'); container.innerHTML = html;
    const rows = [...container.querySelectorAll('li')].filter(row => row.textContent?.includes('去殼'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('去殼打散');
    expect(rows[0].textContent).toContain('1');
    expect(rows[1].textContent).toContain('去殼蛋液重量，約1隻');
    expect(rows[1].textContent).toContain('50');
    expect(JSON.stringify(recipe)).toBe(original);
  });
  it('renders reader-facing notes and preserves source links without an editorial update date', () => {
    const provenance = recipeProvenance({
      consistency_review: { public_notes: ['圖片為AI生成示意圖。'] },
      source_attribution: { website: '參考網站', original_recipe_url: 'https://example.com/recipe',
        adaptation_note: '依批准菜式整理中文材料、用量及步驟；任何本版編定須明示。；本版保留薑汁。' },
      nutrition: { policy: '基本版不含選配。全投入估算並非實際吃下量；骨殼去除率、油鹽吸收及酒精蒸發未實測。',
        limitations: ['營養為估算，未經實煮或化驗。'] },
    });
    const html = renderToString(<RecipeDetail recipe={{ ...RECIPE, ...provenance }} error={null} />);
    expect(html).toContain('烹調前須知');
    expect(html).toContain('圖片為AI生成示意圖。');
    expect(html).toContain('本版保留薑汁。');
    expect(html).toContain('href="https://example.com/recipe"');
    expect(html).toContain('酒精揮發未經實測');
    expect(html).toContain('營養為估算，未經化驗。');
    expect(html).not.toMatch(/依批准|須明示|最後更新|編輯整理|實煮|試煮|已實測/);
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
    vi.mocked(fetchRecipeLinkCatalog).mockResolvedValueOnce([{ id: 'other', slug: 'other', name: '其他菜', meal_role: null,
      is_complete_meal: false, primary_protein: null, cuisine: null, method: null, flavor: null }]);
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
