// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { createElement, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Layout from '@/components/layout/Layout';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import { invalidateFavoritesCache, prefetchFavorites, useFavorites } from '@/hooks/useFavorites';
const { auth } = vi.hoisted(() => ({ auth: {
  loading: false, isAuthenticated: true, user: { id: 'intent-A' } as { id: string } | null, favoritesEpoch: 1,
  getAccessToken: (() => Promise.resolve('synthetic-token-A')) as () => Promise<string | null>, signOut: vi.fn(),
} }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { ...props, href }, children) }));
const response = (ids = ['A']) => ({ ok: true, status: 200, json: async () => ({ success: true, data: { favorites: ids, recipes: ids.map(id => ({ id, name: id })) } }) });
beforeEach(() => {
  invalidateFavoritesCache(); auth.loading = false; auth.isAuthenticated = true; auth.user = { id: 'intent-A' }; auth.favoritesEpoch = 1;
  auth.getAccessToken = () => Promise.resolve('synthetic-token-A');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
});
afterEach(() => { cleanup(); invalidateFavoritesCache(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('mounting the Header controller does not fetch favorites or retrieve a token', async () => {
  const token = vi.fn().mockResolvedValue('synthetic-token-A'); auth.getAccessToken = token;
  renderHook(() => useHeaderController()); await act(async () => {});
  expect(token).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('only the Favorites link pointer/focus/touch triggers intent, without changing normal navigation', () => {
  const intent = vi.fn(); render(createElement(Header, { navLinks: [{ path: '/recipes', label: '食譜' }, { path: '/favorites', label: '收藏' }], onFavoritesIntent: intent }));
  fireEvent.pointerEnter(screen.getByRole('link', { name: '食譜' })); expect(intent).not.toHaveBeenCalled();
  fireEvent.touchStart(screen.getByRole('link', { name: '食譜' })); expect(intent).not.toHaveBeenCalled();
  const favorite = screen.getByRole('link', { name: '收藏' }); fireEvent.pointerEnter(favorite); fireEvent.focus(favorite);
  fireEvent.touchStart(favorite);
  expect(intent).toHaveBeenCalledTimes(3); expect(favorite.getAttribute('href')).toBe('/favorites');
});
it('touch followed by focus and pointer intent through Layout shares one pending GET', async () => {
  let complete!: (value: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  const PageLayout = Layout as ComponentType<{ children: ReactNode }>;
  render(createElement(PageLayout, null, 'mobile intent'));
  const favorite = within(screen.getByRole('navigation')).getByRole('link', { name: '收藏' });
  fireEvent.touchStart(favorite); fireEvent.focus(favorite); fireEvent.pointerEnter(favorite);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  await act(async () => { complete(response()); });
  expect(fetch).toHaveBeenCalledTimes(1); expect(favorite.getAttribute('href')).toBe('/favorites');
});
it('mobile touch starts intent without closing the menu; the subsequent click retains normal navigation', () => {
  const intent = vi.fn();
  render(createElement(Header, { navLinks: [{ path: '/favorites', label: '收藏' }], onFavoritesIntent: intent }));
  fireEvent.click(screen.getByRole('button', { name: '' }));
  const favorite = within(screen.getAllByRole('navigation')[1]).getByRole('link', { name: '收藏' });
  fireEvent.touchStart(favorite);
  expect(intent).toHaveBeenCalledTimes(1); expect(screen.getAllByRole('navigation')).toHaveLength(2);
  expect(favorite.getAttribute('href')).toBe('/favorites');
  fireEvent.click(favorite); expect(screen.getAllByRole('navigation')).toHaveLength(1);
});
it('the real Layout forwards authenticated intent through controller and Header to the shared fetch', async () => {
  const PageLayout = Layout as ComponentType<{ children?: ReactNode }>;
  render(createElement(PageLayout, null, createElement('div', {}, 'Recipe page content')));
  await act(async () => {}); expect(fetch).not.toHaveBeenCalled();
  const link = within(screen.getByRole('navigation')).getByRole('link', { name: '收藏' });
  fireEvent.focus(link); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/user/favorites?include=recipes');
  expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer synthetic-token-A' });
});
it('prefetch completes before navigation; mounting Favorites reuses it with no second GET', async () => {
  const header = renderHook(() => useHeaderController());
  await act(async () => { expect(await header.result.current.onFavoritesIntent()).toBe(true); }); header.unmount();
  const page = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  expect(page.result.current.loading).toBe(false); expect(page.result.current.recipes).toHaveLength(1);
  await act(async () => {}); expect(fetch).toHaveBeenCalledTimes(1);
});
it('repeated intent and navigation during pending prefetch share one in-flight full GET', async () => {
  let complete!: (v: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  const header = renderHook(() => useHeaderController()); let first!: Promise<boolean>; let second!: Promise<boolean>;
  act(() => { first = header.result.current.onFavoritesIntent(); second = header.result.current.onFavoritesIntent(); });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  const page = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  expect(fetch).toHaveBeenCalledTimes(1); header.unmount();
  await act(async () => { complete(response()); await Promise.all([first, second]); });
  expect(page.result.current.recipes).toHaveLength(1); expect(fetch).toHaveBeenCalledTimes(1);
});
it('speculative prefetch leaves a pending foreground ID-only read untouched', async () => {
  let finishIds!: (v: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finishIds = resolve; }) as never);
  const ids = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { sessionKey: 1 }));
  const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
  expect(await prefetchFavorites('synthetic-token-A', 'intent-A', 1)).toBe(false);
  expect(signal?.aborted).toBe(false); expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => { finishIds(response(['A'])); });
  expect(ids.result.current.favorites).toEqual(['A']); expect(ids.result.current.error).toBeNull();
  const full = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  await waitFor(() => expect(full.result.current.recipes).toHaveLength(1));
  expect(fetch).toHaveBeenCalledTimes(2);
});
it.each([
  { onLine: false },
  { onLine: true, connection: { saveData: true } },
  { onLine: true, connection: { effectiveType: '2g' } },
  { onLine: true, connection: { effectiveType: 'slow-2g' } },
])('restricted network skips speculative token retrieval and GET but permits real navigation: %j', async hints => {
  vi.stubGlobal('navigator', hints);
  const token = vi.fn().mockResolvedValue('synthetic-token-A'); auth.getAccessToken = token;
  const header = renderHook(() => useHeaderController());
  expect(await header.result.current.onFavoritesIntent()).toBe(false);
  expect(await prefetchFavorites('synthetic-token-A', 'intent-A', 1)).toBe(false);
  expect(token).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  const full = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  await waitFor(() => expect(full.result.current.recipes).toHaveLength(1));
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('a hidden page does not start speculative work', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  expect(await prefetchFavorites('synthetic-token-A', 'intent-A', 1)).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
it('returning to fresh confirmed favorites on save-data needs no network request', async () => {
  const first = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  await waitFor(() => expect(first.result.current.hasLoaded).toBe(true)); first.unmount();
  vi.stubGlobal('navigator', { onLine: true, connection: { saveData: true } });
  const next = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  expect(next.result.current.loading).toBe(false); expect(next.result.current.recipes).toHaveLength(1);
  await act(async () => {}); expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([{ loading: true, isAuthenticated: true }, { loading: false, isAuthenticated: false }])('no prefetch for disabled auth: %j', async state => {
  Object.assign(auth, state); const header = renderHook(() => useHeaderController());
  expect(await header.result.current.onFavoritesIntent()).toBe(false); expect(fetch).not.toHaveBeenCalled();
});
it('a token resolving after logout or account switch cannot begin an old-account prefetch', async () => {
  let complete!: (v: string) => void; auth.getAccessToken = () => new Promise(resolve => { complete = resolve; });
  const header = renderHook(() => useHeaderController()); let intent!: Promise<boolean>;
  act(() => { intent = header.result.current.onFavoritesIntent(); });
  auth.user = { id: 'intent-B' }; auth.favoritesEpoch = 2; auth.getAccessToken = () => Promise.resolve('synthetic-token-B'); header.rerender();
  await act(async () => { complete('synthetic-token-A'); expect(await intent).toBe(false); }); expect(fetch).not.toHaveBeenCalled();
  await act(async () => { await header.result.current.onFavoritesIntent(); });
  expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer synthetic-token-B' });
});
it('an unmounted Header callback cannot resolve a late token or start prefetch', async () => {
  let complete!: (v: string) => void; auth.getAccessToken = () => new Promise(resolve => { complete = resolve; });
  const header = renderHook(() => useHeaderController()); let intent!: Promise<boolean>;
  act(() => { intent = header.result.current.onFavoritesIntent(); }); const old = header.result.current.onFavoritesIntent; header.unmount();
  await act(async () => { complete('synthetic-token-A'); expect(await intent).toBe(false); });
  expect(await old()).toBe(false); expect(fetch).not.toHaveBeenCalled();
});
it('auth invalidation aborts issued prefetch; late results do not seed a new login cache', async () => {
  let complete!: (v: unknown) => void; vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  const pending = prefetchFavorites('synthetic-token-A', 'intent-A', 1);
  const signal = vi.mocked(fetch).mock.calls[0][1]?.signal; invalidateFavoritesCache(); expect(signal?.aborted).toBe(true);
  await act(async () => { complete(response()); expect(await pending).toBe(false); });
  const next = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 2 }));
  expect(next.result.current.recipes).toEqual([]); await waitFor(() => expect(next.result.current.recipes).toHaveLength(1)); expect(fetch).toHaveBeenCalledTimes(2);
});
it('failed intent is silent and does not prevent a genuine Favorites load from recovering', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('synthetic')); const header = renderHook(() => useHeaderController());
  await act(async () => { expect(await header.result.current.onFavoritesIntent()).toBe(false); }); header.unmount();
  const page = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  await waitFor(() => expect(page.result.current.recipes).toHaveLength(1)); expect(page.result.current.error).toBeNull(); expect(fetch).toHaveBeenCalledTimes(2);
});
it('a completed fresh prefetch does not repeat, but an expired prefetch revalidates', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000); await prefetchFavorites('synthetic-token-A', 'intent-A', 1);
  await prefetchFavorites('synthetic-token-A', 'intent-A', 1); expect(fetch).toHaveBeenCalledTimes(1);
  now.mockReturnValue(31_000); await prefetchFavorites('synthetic-token-A', 'intent-A', 1); expect(fetch).toHaveBeenCalledTimes(2);
});
it('a stalled speculative prefetch releases ownership and cancels when no page needs it', async () => {
  vi.useFakeTimers(); let complete!: (v: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  const pending = prefetchFavorites('synthetic-token-A', 'intent-A', 1); const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
  await act(async () => { vi.advanceTimersByTime(5000); expect(await pending).toBe(false); }); expect(signal?.aborted).toBe(true);
  await act(async () => { complete(response()); }); vi.useRealTimers();
  const page = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  await waitFor(() => expect(page.result.current.recipes).toHaveLength(1)); expect(fetch).toHaveBeenCalledTimes(2);
});
it('a speculative timeout does not cancel the GET once a real page has joined it', async () => {
  vi.useFakeTimers(); let complete!: (v: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  const pending = prefetchFavorites('synthetic-token-A', 'intent-A', 1); const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
  const page = renderHook(() => useFavorites('synthetic-token-A', 'intent-A', { includeRecipes: true, sessionKey: 1 }));
  await act(async () => { vi.advanceTimersByTime(5000); expect(await pending).toBe(false); }); expect(signal?.aborted).toBe(false);
  await act(async () => { complete(response()); }); expect(page.result.current.recipes).toHaveLength(1); expect(fetch).toHaveBeenCalledTimes(1);
});
it('concurrent intent events share token resolution and a fresh result skips token retrieval', async () => {
  let resolveToken!: (token: string) => void;
  const token = vi.fn(() => new Promise<string>(resolve => { resolveToken = resolve; }));
  auth.getAccessToken = token;
  const header = renderHook(() => useHeaderController());
  let first!: Promise<boolean>; let second!: Promise<boolean>;
  act(() => { first = header.result.current.onFavoritesIntent(); second = header.result.current.onFavoritesIntent(); });
  await waitFor(() => expect(token).toHaveBeenCalledTimes(1));
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => { resolveToken('synthetic-token-A'); await Promise.all([first, second]); });
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => { expect(await header.result.current.onFavoritesIntent()).toBe(true); });
  expect(token).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledTimes(1);
});
it('a failed intent token can be retried without retaining a failed pending promise', async () => {
  const token = vi.fn().mockRejectedValueOnce(new Error('token unavailable')).mockResolvedValue('synthetic-token-A');
  auth.getAccessToken = token;
  const header = renderHook(() => useHeaderController());
  await act(async () => { expect(await header.result.current.onFavoritesIntent()).toBe(false); });
  await act(async () => { expect(await header.result.current.onFavoritesIntent()).toBe(true); });
  expect(token).toHaveBeenCalledTimes(2); expect(fetch).toHaveBeenCalledTimes(1);
});
