import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import HomePlannerIntro from '@/components/home/HomePlannerIntro';
import HomeSamplePlan from '@/components/home/HomeSamplePlan';
import HomeSamplePlans from '@/components/home/HomeSamplePlans';
import { readFileSync } from 'node:fs';
import type { SamplePlan } from '@/features/guides/samplePlan';
beforeEach(() => {
  delete window.__prepmealHomeFeatured;
  sessionStorage.clear(); localStorage.clear();
  sessionStorage.setItem('prepmeal:home-hero:v1', JSON.stringify(['chicken']));
  window.eval(readFileSync('src/features/home/featuredBootstrap.js', 'utf8'));
});
afterEach(cleanup);
const plan: SamplePlan = { servings: 2, days: [
  { day: '一', note: '', dishes: [{ slug: 'chicken', name: '雞丁', image_url: 'https://images.unsplash.com/chicken.jpg', total_time_minutes: 20, ingredientExcerpt: [{ name: '雞肉', quantityText: '300 克' }] }] },
  { day: '二', note: '', dishes: [{ slug: 'fish', name: '蒸魚', image_url: 'https://images.unsplash.com/fish.jpg', total_time_minutes: 20, ingredientExcerpt: [{ name: '魚柳', quantityText: '360 克' }] }] },
], sections: [{ key: 'meat', label: '肉類', items: [{ name: '全週魚柳', quantityText: '900 克', category: 'meat', dishCount: 3 }] }], itemCount: 1, sharedItems: [] };
const heroes = (p: SamplePlan) => p.days.map(day => ({ ...day.dishes[0], servings: 2 }));
const active = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>('.pm-hero-item')).find(e => getComputedStyle(e).display !== 'none')!;
describe('hero image and dish ingredient selection', () => {
  it('renders the chosen recipe name and scaled excerpt in server HTML', () => {
    const html = renderToString(<HomePlannerIntro recipes={[heroes(plan)[1]]} />);
    expect(html).toContain('data-hero-slug="fish"'); expect(html).toContain('呢道菜嘅材料節錄');
    expect(html).toContain('360 克'); expect(html).not.toContain('900 克'); expect(html).not.toContain('300 克');
  });
  it('uses the available fallback dish and its ingredients when the configured hero has no image', () => {
    const missing = { ...plan, days: [{ ...plan.days[0], dishes: [{ ...plan.days[0].dishes[0], image_url: null }] }, plan.days[1]] };
    const { container } = render(<HomePlannerIntro recipes={heroes(missing)} />);
    expect(container.querySelector('.pm-main-photo')?.getAttribute('alt')).toBe('蒸魚');
    expect(container.querySelector('.pm-mini-items')?.textContent).toBe('魚柳360 克');
  });
  it('hides an unavailable excerpt without borrowing any weekly or other-dish materials', () => {
    const missing = { ...plan, days: [{ ...plan.days[0], dishes: [{ ...plan.days[0].dishes[0], ingredientExcerpt: [] }] }, plan.days[1]] };
    const { container } = render(<HomePlannerIntro recipes={heroes(missing)} />);
    expect(container.querySelector('.pm-main-photo')?.getAttribute('alt')).toBe('蒸魚'); expect(container.querySelector('.pm-mini-items')?.textContent).toBe('魚柳360 克');
  });
  it('switches the recipe, name and excerpt together after optimizer and original failure; exhausts without looping', () => {
    const { container } = render(<HomePlannerIntro recipes={heroes(plan)} />);
    fireEvent.change(container.querySelector('select')!, { target: { value: '4' } });
    fireEvent.click(container.querySelector('input[name="days"][value="3"]')!);
    fireEvent.error(active(container).querySelector('.pm-main-photo')!);
    expect(active(container).querySelector('.pm-main-photo')?.getAttribute('src')).toBe('https://images.unsplash.com/chicken.jpg');
    fireEvent.error(active(container).querySelector('.pm-main-photo')!);
    expect(active(container).querySelector('.pm-main-photo')?.getAttribute('alt')).toBe('蒸魚');
    expect(active(container).querySelector('.pm-mini-dish')?.textContent).toBe('蒸魚（2人份）');
    expect(active(container).querySelector('.pm-mini-items')?.textContent).toBe('魚柳360 克');
    fireEvent.error(active(container).querySelector('.pm-main-photo')!); fireEvent.error(active(container).querySelector('.pm-main-photo')!);
    expect((container.querySelector('#home-hero-list') as HTMLElement).hidden).toBe(true); expect(container.querySelector('.pm-hero-text-only')).not.toBeNull();
    expect(container.querySelector('#home-plan-form')).not.toBeNull();
    expect(container.querySelector('select')?.value).toBe('4');
    expect((container.querySelector('input[name="days"][value="3"]') as HTMLInputElement).checked).toBe(true);
  });
});
describe('sample thumbnail failure has a bounded, linked fallback', () => {
  it('tries the original once, then removes the failed image and preserves the recipe link and slot', () => {
    const { container, rerender } = render(<HomeSamplePlan plan={plan} />);
    const first = () => container.querySelector('.pm-meal-main')!;
    fireEvent.error(first().querySelector('img')!);
    expect(first().querySelector('img')?.getAttribute('src')).toBe('https://images.unsplash.com/chicken.jpg');
    fireEvent.error(first().querySelector('img')!);
    expect(first().querySelector('img')).toBeNull(); expect(first().querySelector('.pm-photo-fallback')?.textContent).toBe('圖片暫未能顯示');
    expect(first().getAttribute('href')).toBe('/recipes/chicken'); expect(first().textContent).toContain('雞丁');
    rerender(<HomeSamplePlan plan={{ ...plan }} />); expect(first().querySelector('img')).toBeNull();
    const changed = { ...plan, days: [{ ...plan.days[0], dishes: [plan.days[1].dishes[0]] }] };
    rerender(<HomeSamplePlan plan={changed} />); expect(first().querySelector('img')).not.toBeNull();
  });
});


it('hydrates the prepaint hero without replacing its image or ingredients, and keeps form/rerenders stable', async () => {
  const recipes = heroes(plan), source = readFileSync('src/features/home/featuredBootstrap.js', 'utf8');
  const element = <HomePlannerIntro recipes={recipes} bootstrap={source} />;
  const container = document.createElement('div'); document.body.appendChild(container);
  container.innerHTML = renderToString(element);
  expect(container.querySelectorAll('.pm-hero-item')).toHaveLength(2);
  const chosen = window.__prepmealHomeFeatured!.mount(recipes.map(r => r.slug), true, 'hero');
  const before = active(container).textContent;
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: error => errors.push(error) }); });
  expect(active(container).textContent).toBe(before);
  fireEvent.change(container.querySelector('select')!, { target: { value: '5' } });
  fireEvent.click(container.querySelector('input[name="days"][value="3"]')!);
  await act(async () => { root!.render(<HomePlannerIntro recipes={recipes.map(r => ({ ...r }))} bootstrap={source} />); });
  window.dispatchEvent(new Event('focus'));
  expect(window.__prepmealHomeFeatured!.mount(recipes.map(r => r.slug), false, 'hero')).toEqual(chosen);
  expect(active(container).textContent).toBe(before); expect(errors).toEqual([]);
  await act(async () => root!.unmount()); container.remove();
});

it('SSR includes complete menu/list pairs with unique headings; hydration preserves the prepaint whole group', async () => {
  const source = readFileSync('src/features/home/featuredBootstrap.js', 'utf8');
  const candidates = [
    { id: 'one', plan },
    { id: 'two', plan: { ...plan, days: [{ ...plan.days[1], dishes: [plan.days[1].dishes[0]] }],
      sections: [{ ...plan.sections[0], items: [{ ...plan.sections[0].items[0], name: '另一組魚柳', quantityText: '360 克' }] }] } },
  ];
  const element = <HomeSamplePlans candidates={candidates} bootstrap={source} />;
  const container = document.createElement('div'); document.body.appendChild(container);
  container.innerHTML = renderToString(element);
  const headings = [...container.querySelectorAll('h2')].map(h => h.id);
  expect(new Set(headings).size).toBe(2);
  expect(container.textContent).toContain('900 克'); expect(container.textContent).toContain('360 克');
  expect(container.querySelectorAll('details')).toHaveLength(0);
  const chosen = window.__prepmealHomeFeatured!.mount(candidates.map(c => c.id), true, 'sample');
  const selected = () => [...container.querySelectorAll<HTMLElement>('.pm-sample-item')].find(e => getComputedStyle(e).display !== 'none')!;
  const before = selected().textContent, image = selected().querySelector('img'), errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: error => errors.push(error) }); });
  expect(selected().dataset.sampleId).toBe(chosen[0]); expect(selected().textContent).toBe(before); expect(selected().querySelector('img')).toBe(image);
  await act(async () => root!.render(<HomeSamplePlans candidates={candidates.map(c => ({ ...c }))} bootstrap={source} />));
  window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange'));
  expect(selected().dataset.sampleId).toBe(chosen[0]); expect(selected().textContent).toBe(before); expect(errors).toEqual([]);
  await act(async () => root!.unmount()); container.remove();
});
