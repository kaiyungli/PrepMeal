// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { invalidateFavoritesCache, useFavorites } from '@/hooks/useFavorites';
const body = (ids: string[]) => ({ success: true, data: { favorites: ids, recipes: ids.map(id => ({ id, name: id })) } });
const response = (ids: string[]) => ({ ok: true, status: 200, json: async () => body(ids) });
const mount = (sessionKey = 1, includeRecipes = true) => renderHook(() => useFavorites('synthetic-token', 'cache-user', { includeRecipes, sessionKey }));
beforeEach(() => { invalidateFavoritesCache(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(['A', 'B']))); });
afterEach(() => { cleanup(); invalidateFavoritesCache(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('reuses confirmed recipes across unmount/remount within 30 seconds with no GET', async () => {
  const first = mount(); await waitFor(() => expect(first.result.current.recipes).toHaveLength(2));
  const recipes = first.result.current.recipes; first.unmount(); const next = mount();
  expect(next.result.current.recipes).toEqual(recipes); expect(next.result.current.loading).toBe(false);
  await act(async () => {}); expect(fetch).toHaveBeenCalledTimes(1);
});
it('expired cache stays visible while one background GET updates it', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const first = mount(); await waitFor(() => expect(first.result.current.recipes).toHaveLength(2)); first.unmount();
  now.mockReturnValue(31_000); let complete!: (v: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  const next = mount(); expect(next.result.current.favorites).toEqual(['A', 'B']);
  expect(next.result.current.loading).toBe(false); expect(next.result.current.refreshing).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => { complete(response(['C'])); }); expect(next.result.current.recipes.map((r: { id: string }) => r.id)).toEqual(['C']);
});
it('background failure retains confirmed data and retry repairs the error', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const first = mount(); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true)); first.unmount();
  now.mockReturnValue(31_001); vi.mocked(fetch).mockRejectedValueOnce(new Error('synthetic'));
  const next = mount(); await waitFor(() => expect(next.result.current.error).toBeTruthy());
  expect(next.result.current.favorites).toEqual(['A', 'B']); expect(next.result.current.loading).toBe(false);
  await act(async () => { await next.result.current.retry(); }); expect(next.result.current.error).toBeNull();
});
it('a fresh ID-only cache still fetches full recipes rather than falsely showing empty', async () => {
  const first = mount(1, false); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true)); first.unmount();
  let complete!: (v: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  const next = mount(); expect(next.result.current.loading).toBe(true); expect(next.result.current.hasLoaded).toBe(false);
  await act(async () => { complete(response(['A'])); }); expect(next.result.current.recipes).toHaveLength(1);
  expect(vi.mocked(fetch).mock.calls.at(-1)?.[0]).toBe('/api/user/favorites?include=recipes');
});
it('a successful write updates the confirmed cache for the next page', async () => {
  const first = mount(); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true));
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) } as never);
  await act(async () => { await first.result.current.setFavorite('A', false); }); first.unmount();
  const next = mount(); expect(next.result.current.favorites).toEqual(['B']); await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('adding a recipe absent from cached metadata forces a full recipe load on return', async () => {
  const first = mount(); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true)); first.unmount();
  const ids = mount(1, false); await act(async () => {});
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ success: true }) } as never);
  await act(async () => { await ids.result.current.setFavorite('C', true); }); ids.unmount();
  vi.mocked(fetch).mockResolvedValueOnce(response(['A', 'B', 'C']) as never);
  const next = mount(); expect(next.result.current.loading).toBe(true);
  await waitFor(() => expect(next.result.current.recipes).toHaveLength(3)); expect(fetch).toHaveBeenCalledTimes(3);
});
it('a pending write on final unmount discards cache; its late result cannot overwrite a remount', async () => {
  const first = mount(); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true));
  let complete!: (v: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }) as never);
  act(() => { void first.result.current.setFavorite('A', false); });
  const signal = vi.mocked(fetch).mock.calls.at(-1)?.[1]?.signal; first.unmount(); expect(signal?.aborted).toBe(true);
  vi.mocked(fetch).mockResolvedValueOnce(response(['C']) as never);
  const next = mount(); expect(next.result.current.favorites).toEqual([]);
  await waitFor(() => expect(next.result.current.favorites).toEqual(['C']));
  await act(async () => { complete({ ok: true, status: 200, json: async () => ({ success: true }) }); });
  expect(next.result.current.favorites).toEqual(['C']); expect(fetch).toHaveBeenCalledTimes(3);
});
it('a different login epoch cannot reuse the same user cache', async () => {
  const first = mount(1); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true)); first.unmount();
  vi.mocked(fetch).mockResolvedValueOnce(response(['C']) as never); const next = mount(2);
  expect(next.result.current.favorites).toEqual([]); await waitFor(() => expect(next.result.current.favorites).toEqual(['C']));
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('invalidating with no mounted consumers removes previous confirmed data', async () => {
  const first = mount(); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true)); first.unmount();
  invalidateFavoritesCache(); const next = mount(); expect(next.result.current.favorites).toEqual([]);
  await waitFor(() => expect(next.result.current.hasLoaded).toBe(true)); expect(fetch).toHaveBeenCalledTimes(2);
});
it('idle entries are evicted after five minutes and do not retain account data forever', async () => {
  const first = mount(); await waitFor(() => expect(first.result.current.hasLoaded).toBe(true));
  vi.useFakeTimers(); first.unmount(); await act(async () => { vi.advanceTimersByTime(300_000); });
  vi.useRealTimers(); const next = mount(); expect(next.result.current.favorites).toEqual([]);
  await waitFor(() => expect(next.result.current.hasLoaded).toBe(true)); expect(fetch).toHaveBeenCalledTimes(2);
});
