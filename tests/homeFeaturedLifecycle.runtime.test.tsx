import { act, cleanup } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import HomeFeaturedRecipes from '@/components/home/HomeFeaturedRecipes';
import RecipeDetailContent from '@/components/RecipeDetailContent';
import { normalizeRecipeDetail } from '@/features/recipes/mappers/normalizeRecipeDetail';
import type { RecipeDetailRow } from '@/features/recipes/services/getRecipeDetail';
vi.mock('next/link', () => ({ default: ({ href, children, prefetch, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => { void prefetch; return <a href={href} {...props}>{children}</a>; } }));
vi.mock('@/features/home/hooks/useHomeFeaturedFavorites', () => ({ useHomeFeaturedFavorites: () => ({ isFavorite: () => false, isPending: () => false, onFavoriteClick: vi.fn(), toast: null }) }));
const source = readFileSync('src/features/home/featuredBootstrap.js', 'utf8');
const rows = Array.from({ length: 8 }, (_, i) => ({ id: `${i}`, slug: `food-${i}`, name: `菜式${i}`, image_url: 'https://images.unsplash.com/test.jpg', total_time_minutes: 20, difficulty: 'easy', calories_per_serving: 361, protein_g: 37 }));
let root: Root | undefined;
beforeEach(() => {
  delete window.__prepmealHomeFeatured;
  sessionStorage.removeItem('prepmeal:home-featured:v1'); localStorage.removeItem('prepmeal:home-featured:last:v1');
  document.getElementById('home-featured-visibility')?.remove();
});
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; cleanup(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('featured SSR and hydration lifecycle', () => {
  it.each([1, 2, 3, 8])('keeps complete SSR markup for %i candidates and hydrates without replacing the chosen group', async count => {
    const recipes = rows.slice(0, count), element = <HomeFeaturedRecipes recipes={recipes} bootstrap={source} />;
    const container = document.createElement('div'); document.body.appendChild(container);
    container.innerHTML = renderToString(element);
    expect(container.querySelectorAll('.pm-recipe-card')).toHaveLength(count);
    expect(container.querySelector('h3')?.textContent).toBe('菜式0');
    // Emulate the parser executing the trusted bootstrap before the cards paint.
    window.eval(source);
    const first = window.__prepmealHomeFeatured!.mount(recipes.map(r => r.slug), true);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { root = hydrateRoot(container, element); });
    expect(window.__prepmealHomeFeatured!.mount(recipes.map(r => r.slug), false)).toEqual(first);
    expect(error).not.toHaveBeenCalled();
    expect(container.querySelectorAll('a a,a button,button a')).toHaveLength(0);
    await act(async () => { root!.render(<HomeFeaturedRecipes recipes={recipes.map(r => ({ ...r }))} bootstrap={source} />); });
    window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange'));
    expect(window.__prepmealHomeFeatured!.mount(recipes.map(r => r.slug), false)).toEqual(first);
    expect(error).not.toHaveBeenCalled();
  });
  it('uses DOM order for the visible cards even when the saved draw order differs', async () => {
    const selected = ['food-7', 'food-1', 'food-4'];
    sessionStorage.setItem('prepmeal:home-featured:v1', JSON.stringify(selected));
    const element = <HomeFeaturedRecipes recipes={rows} bootstrap={source} />;
    const container = document.createElement('div'); document.body.appendChild(container);
    container.innerHTML = renderToString(element);
    window.eval(source);
    expect(window.__prepmealHomeFeatured!.mount(rows.map(r => r.slug), false)).toEqual(selected);
    const visible = () => Array.from(container.querySelectorAll<HTMLAnchorElement>('.pm-recipe-card'))
      .filter(card => getComputedStyle(card).display !== 'none');
    const before = visible().map(card => card.querySelector('a')?.getAttribute('href'));
    expect(before).toEqual(['/recipes/food-1', '/recipes/food-4', '/recipes/food-7']);
    expect(visible().every(card => !card.hasAttribute('tabindex') && !getComputedStyle(card).order)).toBe(true);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { root = hydrateRoot(container, element); });
    expect(visible().map(card => card.querySelector('a')?.getAttribute('href'))).toEqual(before);
    expect(error).not.toHaveBeenCalled();
  });
  it('escapes a closing script tag in serialized recipe identities', () => {
    const html = renderToString(<HomeFeaturedRecipes recipes={[{ ...rows[0], slug: '</script><script>alert(1)</script>' }]} bootstrap={source} />);
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
    expect(script).toContain('\\u003c/script>');
    expect(script).not.toContain('</script>');
  });
});


describe('home card facts and per-person detail values', () => {
  it.each([
    { facts: { total_time_minutes: 30, difficulty: 'easy', calories_per_serving: 361, protein_g: 37 }, meta: '⏱️30分鐘·容易', nutrition: '🔥361 卡路里／人·💪37g 蛋白質／人' },
    { facts: { total_time_minutes: null, difficulty: 'medium', calories_per_serving: null, protein_g: 12.5 }, meta: '中等', nutrition: '💪12.5g 蛋白質／人' },
    { facts: { total_time_minutes: 15, difficulty: null, calories_per_serving: 83.5, protein_g: null }, meta: '⏱️15分鐘', nutrition: '🔥83.5 卡路里／人' },
    { facts: { total_time_minutes: 0, difficulty: '簡單', calories_per_serving: 0, protein_g: 0 }, meta: '⏱️0分鐘·容易', nutrition: '🔥0 卡路里／人·💪0g 蛋白質／人' },
    { facts: { total_time_minutes: Infinity, difficulty: 'unknown', calories_per_serving: NaN, protein_g: -1 }, meta: '', nutrition: '' },
    { facts: { total_time_minutes: undefined, difficulty: undefined, calories_per_serving: undefined, protein_g: undefined }, meta: '', nutrition: '' },
  ])('renders only valid facts: $meta / $nutrition', ({ facts, meta, nutrition }) => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<HomeFeaturedRecipes recipes={[{ ...rows[0], ...facts }]} />);
    expect(container.querySelector('.pm-featured-meta')?.textContent).toBe(meta);
    expect(container.querySelector('.pm-featured-nutrition')?.textContent).toBe(nutrition);
    expect(container.querySelector('.pm-featured-photo button')).toBeNull();
    expect(container.querySelectorAll('.pm-recipe-card a button, .pm-recipe-card button a')).toHaveLength(0);
    expect(container.querySelector('.pm-featured-body')?.firstElementChild?.tagName).toBe('H3');
    expect(container.querySelectorAll('.pm-recipe-card > a')).toHaveLength(1);
    expect(container.querySelectorAll('.pm-recipe-card button')).toHaveLength(1);
    expect(container.textContent).toContain('營養為每人份估算');
    expect(container.textContent).not.toContain('查看食譜');
  });
  it.each([0, 37.25])('matches detail normalization and display for a real per-person value %s', value => {
    const row = { ...rows[0], calories_per_serving: value, protein_g: value, base_servings: 1, ingredients: [], steps: [] } as unknown as RecipeDetailRow;
    const normalized = normalizeRecipeDetail(row);
    expect(normalized.calories_per_serving).toBe(value); expect(normalized.protein_g).toBe(value);
    const detail = document.createElement('div'); detail.innerHTML = renderToString(<RecipeDetailContent recipe={normalized} deferHeavySections={false} />);
    const nutrition = Array.from(detail.querySelectorAll('h3')).find(h => h.textContent?.includes('營養資料（每人份）'))!.parentElement!;
    const values = nutrition.querySelectorAll('.text-xl');
    expect(values[0].textContent).toBe(String(value)); expect(values[1].textContent).toBe(String(value));
    const card = renderToString(<HomeFeaturedRecipes recipes={[{ ...rows[0], calories_per_serving: value, protein_g: value }]} />);
    const home = document.createElement('div'); home.innerHTML = card;
    expect(home.textContent).toContain(`${value} 卡路里／人`); expect(home.textContent).toContain(`${value}g 蛋白質／人`);
  });
});
