import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';

vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/', asPath: '/', events: { on() {}, off() {} } }) }));

vi.mock('@/features/layout/hooks/useHeaderController', () => ({
  useHeaderController: () => ({ isAuthenticated: false, loading: false, loggingOut: false,
    navLinks: [], guideLinks: [], accountLinks: [], trustLinks: [], isActiveRoute: () => false, handleLogout() {} }),
}));

vi.mock('@/features/home/hooks/useHomeFeaturedFavorites', () => ({ useHomeFeaturedFavorites: () => ({ isFavorite: () => false, isPending: () => false, onFavoriteClick: vi.fn(), toast: null }) }));
import Home from '@/pages/index';
import MealPlanExample from '@/pages/meal-plan-example';
import HealthyDinnerGuide from '@/pages/healthy-dinner-guide';
import IngredientPairingGuide from '@/pages/ingredient-pairing-guide';
import HomeSamplePlan from '@/components/home/HomeSamplePlan';
import HomePlannerIntro from '@/components/home/HomePlannerIntro';
import type { SamplePlan } from '@/features/guides/samplePlan';

const dish = (slug: string) => ({ slug, name: `菜${slug}`, total_time_minutes: 15 });
const PLAN: SamplePlan = {
  servings: 2,
  days: [{ day: '第一天', note: '先蒸後炒', dishes: [dish('a'), dish('b')] }],
  sections: [{ key: 'vegetable', label: '蔬菜', items: [{ name: '蒜頭', quantityText: '6 瓣', dishCount: 2, category: 'vegetable' }] }],
  itemCount: 1,
  sharedItems: [{ name: '蒜頭', quantityText: '6 瓣', dishCount: 2, category: 'vegetable' }],
};
const recipe = (id: string, extra = {}) => ({ id, slug: `s${id}`, name: `菜${id}`, total_time_minutes: 10, calories_per_serving: 300, protein_g: 28, ...extra });

describe('guide pages render real content on the server', () => {
  it('homepage renders its form, complete sample, steps and links without interaction', () => {
    const html = renderToString(<Home sampleCandidates={[{ id: 'test', plan: PLAN }]} featuredRecipes={[]} />);
    expect(html).toContain('action="/generate"');
    expect(html).toContain('name="servings"');
    expect(html).toContain('name="days"');
    expect(html).toContain('蒜頭');
    expect(html).toContain('6 瓣');
    expect(html).toContain('href="/recipes/a"');
    expect(html).toContain('href="/recipes"');
    expect(html).toContain('href="/hong-kong-market-shopping-guide"');
    expect(html.indexOf('一週餐單示範')).toBeLessThan(html.indexOf('如何使用今晚食乜'));
    expect(html.indexOf('如何使用今晚食乜')).toBeLessThan(html.indexOf('精選食譜'));
    expect(html).not.toContain('點擊載入');
  });

  it('keeps collapsed materials in HTML and derives counts from the actual items', () => {
    const plan: SamplePlan = { ...PLAN, itemCount: 999, sections: [
      ...PLAN.sections,
      { key: 'seasoning', label: '調味料', items: [{ name: '鹽', quantityText: '2 茶匙', dishCount: 2, category: 'seasoning' }] },
      { key: 'pantry', label: '儲備', items: [{ name: '雞湯', quantityText: '600 毫升', dishCount: 2, category: 'pantry' }] },
    ] };
    const container = document.createElement('div');
    container.innerHTML = renderToString(<HomeSamplePlan plan={plan} />);
    const details = container.querySelector('details')!;
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.querySelector('summary')?.textContent).toContain('查看全部 3 項材料');
    expect(details.textContent).toContain('共 2 項');
    expect(details.textContent).toContain('600 毫升');
    expect(details.textContent).toContain('2 茶匙');
    expect(container.querySelectorAll('.pm-ingredient-group li')).toHaveLength(3);
    expect(details.querySelectorAll('.pm-ingredient-group li')).toHaveLength(2);
    expect(container.textContent).not.toContain('999');
  });

  it('gives the main photo and name one link, with a separate side link and no nested anchors', () => {
    const main = { ...dish('prepmeal-batch3-16'), name: '薑蔥豉油蒸豆腐（簡易版）', image_url: 'https://images.unsplash.com/test.jpg' };
    const plan = { ...PLAN, days: [{ day: '第一天', note: '', dishes: [main, dish('b')] }] };
    const container = document.createElement('div');
    container.innerHTML = renderToString(<HomeSamplePlan plan={plan} />);
    const mainLink = container.querySelector('.pm-meal-main')!;
    expect(mainLink.getAttribute('href')).toBe('/recipes/prepmeal-batch3-16');
    expect(mainLink.querySelector('img')).toBeTruthy();
    expect(mainLink.textContent).toContain('薑蔥豉油蒸豆腐');
    expect(mainLink.textContent).not.toContain('簡易版');
    expect(mainLink.querySelector('.pm-meal-arrow')).toBeTruthy();
    expect(container.querySelector('.pm-meal-side')?.getAttribute('href')).toBe('/recipes/b');
    expect(container.querySelector('a a')).toBeNull();
    expect(main.name).toBe('薑蔥豉油蒸豆腐（簡易版）');
  });

  it('returns to the focusable original form without adding another submit form or demo parameters', () => {
    const container = document.createElement('div');
    const plan = { ...PLAN, sections: [{ key: 'meat', label: '肉類', items: [{ name: '雞肉', quantityText: '300 克', dishCount: 1, category: 'meat' }] }], days: [{ ...PLAN.days[0], dishes: [
      { ...dish('curry-chicken'), image_url: 'https://images.unsplash.com/test.jpg' }, dish('b'),
    ] }] };
    container.innerHTML = renderToString(<Home sampleCandidates={[{ id: 'test', plan }]} featuredRecipes={[{ id: 'featured', slug: 'featured', name: '精選菜式', total_time_minutes: 20 }]} />);
    expect(container.querySelectorAll('form')).toHaveLength(1);
    expect(container.querySelector('#home-plan-form')?.getAttribute('tabindex')).toBe('-1');
    expect(container.querySelector('.pm-example-action a')?.getAttribute('href')).toBe('#home-plan-form');
    expect(container.textContent).toContain('2人・1晚・家常易煮');
    expect(container.querySelector('.pm-example-action a')?.textContent).toContain('設定我的餐單');
    expect(container.textContent).not.toContain('固定示範');
    expect(container.textContent?.match(/1 人份/g)).toHaveLength(1);
    expect(container.querySelector('.pm-mini-list')).toBeNull(); // Missing per-recipe data stays hidden.
    expect(container.textContent).toContain('白飯另計');
    expect(container.textContent).toContain('生成後按所選人數計算材料');
    expect(container.textContent).toContain('毋須登入，即可生成');
    expect(container.textContent).toContain('加入口味偏好');
    const form = container.querySelector('#home-plan-form')!;
    const note = container.querySelector(`#${form.getAttribute('aria-describedby')}`)!;
    expect(note.textContent).toContain('生成後按所選人數計算材料');
    expect(note.parentElement?.className).toBe('pm-starter-links');
    expect(form.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.querySelector('label .pm-field-label')?.textContent).toBe('幾多人食');
    expect(form.querySelector('fieldset legend')?.textContent).toBe('安排幾日');
    expect(container.querySelector('.pm-example-heading h2 + .pm-fixed-example')?.textContent).toBe('2人・1晚・家常易煮');
    expect(container.querySelector('main')?.textContent).not.toContain('↗');
    expect(container.querySelector('.pm-example-action a')?.textContent).toContain('↑');
  });

  it('submits preferences with the same native form and previews real main ingredients', () => {
    const main = { name: '雞肉', quantityText: '300 克', dishCount: 1, category: 'meat' };
    const plan = { ...PLAN, days: [{ ...PLAN.days[0], dishes: [{ ...dish('a'), image_url: 'https://images.unsplash.com/test.jpg', ingredientExcerpt: [{ name: '雞肉', quantityText: '300 克' }, { name: '菠菜', quantityText: '180 克' }] }] }],
      sections: [{ key: 'seasoning', label: '調味料', items: [{ ...main, name: '鹽' }] },
        { key: 'meat', label: '肉類', items: [main] },
        { key: 'vegetable', label: '蔬菜', items: [{ ...main, name: '蒜頭' }, { ...main, name: '菠菜', quantityText: '680 克' }] }] };
    const container = document.createElement('div');
    container.innerHTML = renderToString(<HomePlannerIntro recipes={plan.days.map(day => ({ ...day.dishes[0], servings: 2 }))} />);
    const button = container.querySelector('button[name="intent"]') as HTMLButtonElement;
    expect(button.type).toBe('submit');
    expect(button.getAttribute('form')).toBe('home-plan-form');
    expect(button.value).toBe('preferences');
    expect(container.querySelectorAll('form')).toHaveLength(1);
    expect(container.querySelector('.pm-mini-items')?.textContent).toBe('雞肉300 克菠菜180 克');
    expect(container.querySelector('.pm-mini-items')?.textContent).not.toMatch(/蒜頭|鹽/);
    expect(container.querySelector('.pm-mini-head')?.textContent).toBe('呢道菜嘅材料節錄');
    expect(container.querySelector('.pm-mini-dish')?.textContent).toContain('菜a（2人份）');
    expect(container.querySelectorAll('.pm-mini-items input,.pm-mini-marker')).toHaveLength(0);
    expect(container.querySelectorAll('.pm-mini-items li')).toHaveLength(2);
  });

  it('sample plan page lists dishes as links and the merged list', () => {
    const html = renderToString(<MealPlanExample plan={PLAN} />);
    expect(html).toContain('href="/recipes/a"');
    expect(html).toContain('蒜頭');
    expect(html).toContain('2道菜');
    expect(html).toContain('href="/generate"');
  });

  it('home sample section links to the full example', () => {
    const html = renderToString(<HomeSamplePlan plan={PLAN} />);
    expect(html).toContain('href="/meal-plan-example"');
    expect(html).toContain('href="/recipes/b"');
    expect(renderToString(<HomeSamplePlan plan={null} />)).toBe('');
  });

  it('healthy guide cites the DH pyramid and lists site recipes', () => {
    const html = renderToString(<HealthyDinnerGuide data={{ leanMains: [recipe('1')], vegSides: [], lighterMeals: [] }} />);
    expect(html).toContain('chp.gov.hk/files/her/exn_nutp_030bp.pdf');
    expect(html).toContain('href="/recipes/s1"');
    expect(html).toContain('目前未有符合條件嘅食譜');
  });

  it('ingredient guide shows notes and recipes per protein', () => {
    const empty = { chicken: [recipe('c')], pork: [], beef: [], fish: [], shrimp: [], tofu: [], egg: [] };
    const html = renderToString(<IngredientPairingGuide data={{ byProtein: empty, vegSides: [recipe('v')] }} />);
    expect(html).toContain('去骨雞腿肉');
    expect(html).toContain('href="/recipes/sc"');
    expect(html).toContain('href="/recipes/sv"');
  });
});
