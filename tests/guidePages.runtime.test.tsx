import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';

vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/', asPath: '/', events: { on() {}, off() {} } }) }));

vi.mock('@/features/layout/hooks/useHeaderController', () => ({
  useHeaderController: () => ({ isAuthenticated: false, loading: false, loggingOut: false,
    navLinks: [], guideLinks: [], accountLinks: [], trustLinks: [], isActiveRoute: () => false, handleLogout() {} }),
}));

import Home from '@/pages/index';
import MealPlanExample from '@/pages/meal-plan-example';
import HealthyDinnerGuide from '@/pages/healthy-dinner-guide';
import IngredientPairingGuide from '@/pages/ingredient-pairing-guide';
import HomeSamplePlan from '@/components/home/HomeSamplePlan';
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
    const html = renderToString(<Home samplePlan={PLAN} featuredRecipes={[]} />);
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
