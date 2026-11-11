import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import HomePlannerIntro from '@/components/home/HomePlannerIntro';
import HomeSamplePlan from '@/components/home/HomeSamplePlan';
import type { SamplePlan } from '@/features/guides/samplePlan';
afterEach(cleanup);
const plan: SamplePlan = { servings: 2, days: [
  { day: '一', note: '', dishes: [{ slug: 'chicken', name: '雞丁', image_url: 'https://images.unsplash.com/chicken.jpg', total_time_minutes: 20, ingredientExcerpt: [{ name: '雞肉', quantityText: '300 克' }] }] },
  { day: '二', note: '', dishes: [{ slug: 'fish', name: '蒸魚', image_url: 'https://images.unsplash.com/fish.jpg', total_time_minutes: 20, ingredientExcerpt: [{ name: '魚柳', quantityText: '360 克' }] }] },
], sections: [{ key: 'meat', label: '肉類', items: [{ name: '全週魚柳', quantityText: '900 克', category: 'meat', dishCount: 3 }] }], itemCount: 1, sharedItems: [] };
describe('hero image and dish ingredient selection', () => {
  it('renders the chosen recipe name and scaled excerpt in server HTML', () => {
    const html = renderToString(<HomePlannerIntro plan={plan} heroSlug="fish" />);
    expect(html).toContain('data-hero-slug="fish"'); expect(html).toContain('呢道菜嘅材料節錄');
    expect(html).toContain('360 克'); expect(html).not.toContain('900 克'); expect(html).not.toContain('300 克');
  });
  it('uses the available fallback dish and its ingredients when the configured hero has no image', () => {
    const missing = { ...plan, days: [{ ...plan.days[0], dishes: [{ ...plan.days[0].dishes[0], image_url: null }] }, plan.days[1]] };
    const { container } = render(<HomePlannerIntro plan={missing} heroSlug="chicken" />);
    expect(container.querySelector('.pm-main-photo')?.getAttribute('alt')).toBe('蒸魚');
    expect(container.querySelector('.pm-mini-items')?.textContent).toBe('魚柳360 克');
  });
  it('hides an unavailable excerpt without borrowing any weekly or other-dish materials', () => {
    const missing = { ...plan, days: [{ ...plan.days[0], dishes: [{ ...plan.days[0].dishes[0], ingredientExcerpt: [] }] }, plan.days[1]] };
    const { container } = render(<HomePlannerIntro plan={missing} heroSlug="chicken" />);
    expect(container.querySelector('.pm-main-photo')?.getAttribute('alt')).toBe('雞丁'); expect(container.querySelector('.pm-mini-list')).toBeNull();
  });
  it('switches the recipe, name and excerpt together after optimizer and original failure; exhausts without looping', () => {
    const { container } = render(<HomePlannerIntro plan={plan} heroSlug="chicken" />);
    fireEvent.change(container.querySelector('select')!, { target: { value: '4' } });
    fireEvent.click(container.querySelector('input[name="days"][value="3"]')!);
    fireEvent.error(container.querySelector('.pm-main-photo')!);
    expect(container.querySelector('.pm-main-photo')?.getAttribute('src')).toBe('https://images.unsplash.com/chicken.jpg');
    fireEvent.error(container.querySelector('.pm-main-photo')!);
    expect(container.querySelector('.pm-main-photo')?.getAttribute('alt')).toBe('蒸魚');
    expect(container.querySelector('.pm-mini-dish')?.textContent).toBe('蒸魚（2人份）');
    expect(container.querySelector('.pm-mini-items')?.textContent).toBe('魚柳360 克');
    fireEvent.error(container.querySelector('.pm-main-photo')!); fireEvent.error(container.querySelector('.pm-main-photo')!);
    expect(container.querySelector('.pm-hero-photo')).toBeNull(); expect(container.querySelector('.pm-mini-list')).toBeNull();
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
