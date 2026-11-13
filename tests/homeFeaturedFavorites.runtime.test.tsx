import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateFavoritesCache } from '@/hooks/useFavorites';
import HomeFeaturedRecipes from '@/components/home/HomeFeaturedRecipes';
import RecipeCard from '@/components/RecipeCard';
const { auth } = vi.hoisted(() => ({ auth: {
  loading: false, isAuthenticated: false, user: null as { id: string } | null, favoritesEpoch: 0,
  getAccessToken: async () => 'synthetic-home-token',
} }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
const recipes = ['a','b','c'].map(id => ({ id, slug: `food-${id}`, name: `菜式${id}`, image_url: 'https://images.unsplash.com/test.jpg',
  total_time_minutes: 30, difficulty: 'medium', method: 'fried', primary_protein: 'chicken', dish_type: 'main', calories_per_serving: 355, protein_g: 30.5 }));
let ids: Set<string>, writes: string[], failWrite: boolean;
beforeEach(() => {
  invalidateFavoritesCache(); ids = new Set(); writes = []; failWrite = false;
  auth.loading = false; auth.isAuthenticated = false; auth.user = null; auth.favoritesEpoch++;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'POST') { writes.push('POST'); if (!failWrite) ids.add(JSON.parse(String(init?.body)).recipe_id); }
    if (method === 'DELETE') { writes.push('DELETE'); if (!failWrite) ids.delete(new URL(_url, 'http://localhost').searchParams.get('recipe_id')!); }
    return { ok: method === 'GET' || !failWrite, status: method !== 'GET' && failWrite ? 500 : 200,
      json: async () => ({ success: true, data: { favorites: [...ids] } }) };
  }));
});
afterEach(() => { cleanup(); invalidateFavoritesCache(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const mount = () => render(<HomeFeaturedRecipes recipes={recipes} />);
async function signedIn() { auth.isAuthenticated = true; auth.user = { id: 'synthetic-A' }; const view = mount(); await act(async () => {}); return view; }

describe('homepage reference cards reuse account favorites', () => {
  it('asks a signed-out user to log in and never attempts a favorite write', async () => {
    const view = mount(); fireEvent.click(screen.getByRole('button', { name: '收藏：菜式a' }));
    expect(await screen.findByRole('status')).toHaveTextContent('請先登入以收藏食譜');
    expect(writes).toEqual([]); expect(view.container.querySelectorAll('a button,button a')).toHaveLength(0);
  });
  it('adds and removes through the real shared hook, with sibling links and named pressed-state buttons', async () => {
    const view = await signedIn(); fireEvent.click(screen.getByRole('button', { name: '收藏：菜式a' }));
    const saved = await screen.findByRole('button', { name: '取消收藏：菜式a' });
    await waitFor(() => expect(saved).toHaveAttribute('aria-busy', 'false'));
    expect(saved).toHaveAttribute('aria-pressed', 'true'); expect(writes).toEqual(['POST']); expect(ids.has('a')).toBe(true);
    fireEvent.click(saved); await waitFor(() => expect(screen.getByRole('button', { name: '收藏：菜式a' })).toHaveAttribute('aria-busy', 'false'));
    expect(writes).toEqual(['POST','DELETE']); expect(ids.has('a')).toBe(false);
    const card = view.container.querySelector('.pm-recipe-card')!;
    expect(card.querySelectorAll(':scope > a')).toHaveLength(1); expect(card.querySelector('a')?.getAttribute('href')).toBe('/recipes/food-a');
    expect(card.querySelectorAll('a button,button a,a a')).toHaveLength(0);
  });
  it('rolls back a failed write and reports the existing mutation error', async () => {
    await signedIn(); failWrite = true; fireEvent.click(screen.getByRole('button', { name: '收藏：菜式a' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '收藏：菜式a' })).toHaveAttribute('aria-pressed', 'false'));
    expect(await screen.findByRole('status')).toHaveTextContent('收藏更新失敗，請重試');
  });
  it('responds to login, account change and logout without retaining another account favorites', async () => {
    const view = mount(); auth.isAuthenticated = true; auth.user = { id: 'synthetic-A' }; view.rerender(<HomeFeaturedRecipes recipes={recipes} />);
    await act(async () => {}); fireEvent.click(screen.getByRole('button', { name: '收藏：菜式a' }));
    const button = await screen.findByRole('button', { name: '取消收藏：菜式a' }); await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'false'));
    ids.clear(); auth.user = { id: 'synthetic-B' }; view.rerender(<HomeFeaturedRecipes recipes={recipes} />); await act(async () => {});
    expect(screen.getByRole('button', { name: '收藏：菜式a' })).toHaveAttribute('aria-pressed', 'false');
    auth.user = null; auth.isAuthenticated = false; view.rerender(<HomeFeaturedRecipes recipes={recipes} />); fireEvent.click(screen.getByRole('button', { name: '收藏：菜式a' }));
    expect(await screen.findByRole('status')).toHaveTextContent('請先登入以收藏食譜'); expect(writes).toEqual(['POST']);
  });
  it('keeps the actual reference icons, translated method/difficulty, real tags and no CTA', () => {
    const { container } = mount(); const card = container.querySelector('.pm-recipe-card')!;
    expect(card.textContent).toContain('⏱️30分鐘·中等·🥘煎');
    expect(card.querySelector('.pm-featured-tags')?.textContent).toBe('雞主菜');
    expect(card.querySelector('.pm-featured-nutrition')?.textContent).toBe('🔥355 卡路里／人·💪30.5g 蛋白質／人');
    expect(container.textContent?.match(/營養為每人份估算/g)).toHaveLength(1); expect(card.textContent).not.toContain('查看食譜');
  });
  it('omits unknown taxonomy values rather than inheriting object properties', () => {
    const { container } = render(<HomeFeaturedRecipes recipes={[{ ...recipes[0], difficulty: 'constructor', method: '__proto__', primary_protein: 'constructor', dish_type: '__proto__' }]} />);
    expect(container.querySelector('.pm-featured-meta')?.textContent).toBe('⏱️30分鐘');
    expect(container.querySelector('.pm-featured-tags')).toBeNull();
  });
  it('leaves default recipe-list card presentation opt-out and retains its original classes', () => {
    const html = renderToString(<RecipeCard recipe={recipes[0]} />);
    expect(html).toContain('aspect-[5/4]'); expect(html).toContain('object-contain rounded-xl'); expect(html).toContain('line-clamp-2');
    expect(html).not.toContain('pm-featured'); expect(html).not.toContain('pm-recipe-card');
  });
});
