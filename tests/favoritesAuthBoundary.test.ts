// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createElement, useEffect, type ComponentType, type ReactNode } from 'react';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { invalidateFavoritesCache, useAccountFavorites } from '@/hooks/useFavorites';
import { favoritesSessionIdentity } from '@/utils/favoritesSession';
const mocks = vi.hoisted(() => ({ callback: null as null | ((event: string, session: unknown) => void), getSession: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ default: { auth: {
  getSession: mocks.getSession,
  onAuthStateChange: (callback: typeof mocks.callback) => { mocks.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
} } }));
function session(user = 'A', login = 'one', token = 'one') {
  return { user: { id: user }, access_token: 'synthetic.' + btoa(JSON.stringify({ session_id: login, token })) + '.signature' };
}
afterEach(() => { cleanup(); invalidateFavoritesCache(); vi.unstubAllGlobals(); });
it('session identity survives token refresh but changes on a new same-account login', () => {
  expect(favoritesSessionIdentity(session('A', 'one', 'new'))).toBe(favoritesSessionIdentity(session()));
  expect(favoritesSessionIdentity(session('A', 'two'))).not.toBe(favoritesSessionIdentity(session()));
  expect(favoritesSessionIdentity(null)).toBeNull();
});
it('AuthProvider invalidates idle cache on logout and same-account relogin, but not refresh', async () => {
  invalidateFavoritesCache(); mocks.getSession.mockResolvedValue({ data: { session: session() } });
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { favorites: ['old'] } }) });
  vi.stubGlobal('fetch', fetcher);
  let result: ReturnType<typeof useAccountFavorites>;
  let epoch = -1;
  function Probe() { const value = useAuthContext().favoritesEpoch; useEffect(() => { epoch = value; }, [value]); return null; }
  function Consumer() { const value = useAccountFavorites(useAuthContext()); useEffect(() => { result = value; }, [value]); return null; }
  const Provider = AuthProvider as ComponentType<{ children?: ReactNode }>;
  const tree = (visible: boolean) => createElement(Provider, null, createElement(Probe, { key: 'probe' }), visible && createElement(Consumer, { key: 'consumer' }));
  const view = render(tree(true)); await waitFor(() => expect(result!.favorites).toEqual(['old']));
  const oldEpoch = epoch; view.rerender(tree(false));
  await act(async () => { mocks.callback!('TOKEN_REFRESHED', session('A', 'one', 'new')); });
  expect(epoch).toBe(oldEpoch); view.rerender(tree(true));
  await waitFor(() => expect(result!.favorites).toEqual(['old'])); expect(fetcher).toHaveBeenCalledTimes(1);
  view.rerender(tree(false));
  await act(async () => { mocks.callback!('SIGNED_OUT', null); });
  await act(async () => { mocks.callback!('SIGNED_IN', session('A', 'two')); });
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { favorites: ['new'] } }) });
  view.rerender(tree(true)); expect(result!.favorites).toEqual([]);
  await waitFor(() => expect(result!.favorites).toEqual(['new'])); expect(fetcher).toHaveBeenCalledTimes(2); expect(epoch).toBeGreaterThan(oldEpoch);
  view.rerender(tree(false));
  await act(async () => { mocks.callback!('SIGNED_IN', session('A', 'three')); });
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { favorites: ['third'] } }) });
  view.rerender(tree(true)); await waitFor(() => expect(result!.favorites).toEqual(['third'])); expect(fetcher).toHaveBeenCalledTimes(3);
  view.rerender(tree(false));
  await act(async () => { mocks.callback!('SIGNED_IN', session('B', 'four')); });
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { favorites: ['B-only'] } }) });
  view.rerender(tree(true)); await waitFor(() => expect(result!.favorites).toEqual(['B-only'])); expect(fetcher).toHaveBeenCalledTimes(4);
  view.rerender(tree(false));
  await act(async () => { mocks.callback!('SIGNED_IN', session('A', 'three')); });
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { favorites: ['A-current'] } }) });
  view.rerender(tree(true)); await waitFor(() => expect(result!.favorites).toEqual(['A-current'])); expect(fetcher).toHaveBeenCalledTimes(5);
});
