// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { beginFavoritesTrace, clearFavoritesTraceRun, favoritesTraceEnabled, markFavoritesCache, markFavoritesTrace, readFavoritesTrace, startFavoritesTraceRun } from '@/features/performance/favoritesLoadTrace';
import { beginNavigationStep, clearNavigationMeasurement, exportNavigationMeasurement, navigationDataReady, navigationRouteCompleted, startNavigationMeasurement, validateNavigationScope } from '@/features/performance/navigationMeasurement';
import { invalidateFavoritesCache, useAccountFavorites, useFavoritesPrefetch } from '@/hooks/useFavorites';
import { timedFavoritesFetch, startFavoritesTiming } from '@/utils/favoritesTiming';
let clock = 0;
beforeEach(() => {
  clearNavigationMeasurement(); invalidateFavoritesCache(); clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  window.history.replaceState({}, '', '/?perf=off'); startFavoritesTiming();
});
afterEach(() => { cleanup(); invalidateFavoritesCache(); clearNavigationMeasurement(); clearFavoritesTraceRun(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('does no tracing until explicitly enabled and clears retired handles before a new run', () => {
  expect(beginFavoritesTrace('read')).toBeNull(); markFavoritesCache(true, true);
  expect(readFavoritesTrace(0, 100)).toBeUndefined();
  startFavoritesTraceRun(); const retired = beginFavoritesTrace('read');
  clearFavoritesTraceRun(); startFavoritesTraceRun(); clock = 100;
  markFavoritesTrace(retired, 'end'); expect(readFavoritesTrace(0, 100)?.operations).toEqual([]);
  clearFavoritesTraceRun(); expect(favoritesTraceEnabled()).toBe(false);
});
it('exports safe numeric stages, pre-click work and non-additive body/publication spans', () => {
  startFavoritesTraceRun(); const token = beginFavoritesTrace('intent_token');
  clock = 10; markFavoritesTrace(token, 'end'); markFavoritesCache(false, true);
  const read = beginFavoritesTrace('read', true); clock = 110;
  markFavoritesTrace(read, 'headers', new Response('{}', { headers: {
    'Server-Timing': 'auth;dur=4, db_request;dur=40, handler;dur=45, pgrst_plan;dur=3, pgrst_transaction;dur=5, private-owner;dur=999',
    'X-PrepMeal-Favorites-Rest': '{"version":1,"fetch_count":1,"postgrest_timing_count":1,"token":"private-secret"}',
    'X-PrepMeal-Favorites-Read-Path': 'rpc',
    Authorization: 'private-secret', 'X-PrepMeal-Favorites-Runtime': 'private-runtime',
  } }));
  clock = 150; markFavoritesTrace(read, 'body'); clock = 160; markFavoritesTrace(read, 'published');
  clock = 170; markFavoritesTrace(read, 'end'); clock = 180; markFavoritesTrace(token, 'end');
  const trace = readFavoritesTrace(20, 200)!;
  expect(trace.operations[0]).toMatchObject({ duration_ms: 10, start_offset_ms: -20, started_before_click: true });
  expect(trace.operations[1]).toMatchObject({ include: 'recipes', read_path: 'rpc', load_to_headers_ms: 100, body_download_parse_ms: 40,
    publish_to_data_ready_ms: 40, auth_ms: 4, db_request_ms: 40, handler_ms: 45, pgrst_plan_ms: 3, pgrst_transaction_ms: 5, postgrest_timing_count: 1, status: 200 });
  expect(JSON.stringify(trace)).not.toMatch(/private-|Authorization|https?:/);
});
it('distinguishes pending reads and failed responses without claiming data publication', () => {
  startFavoritesTraceRun(); const read = beginFavoritesTrace('read'); clock = 20;
  markFavoritesTrace(read, 'headers', new Response('{}', { status: 503, headers: { 'X-PrepMeal-Favorites-Read-Path': 'private-path', 'Server-Timing': 'auth;dur=NaN, db_request;dur=-1, handler;dur=999999' } }));
  expect(readFavoritesTrace(0, 30)?.operations[0]).toMatchObject({ pending_at_data_ready: true, status: 503 });
  clock = 40; markFavoritesTrace(read, 'end');
  const item = readFavoritesTrace(0, 50)!.operations[0];
  expect(item).not.toHaveProperty('published_offset_ms'); expect(item).not.toHaveProperty('handler_ms');
  expect(item).not.toHaveProperty('read_path');
});
it('bounds the run and filters completed operations older than the lookback', () => {
  startFavoritesTraceRun(); const first = beginFavoritesTrace('read'); clock = 1; markFavoritesTrace(first, 'end');
  clock = 6000; for (let i = 0; i < 110; i++) { beginFavoritesTrace('page_token'); markFavoritesCache(true, false); }
  expect(readFavoritesTrace(6000, 6100)?.operations).toHaveLength(99);
  expect(readFavoritesTrace(6000, 6100)?.cache).toHaveLength(100);
});
it('adds only a GET timing header, preserves the response and abort signal, and leaves writes untouched', async () => {
  startFavoritesTraceRun(); const response = new Response('{}'); const fetcher = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetcher); const log = vi.spyOn(console, 'info');
  const options = { headers: { Authorization: 'synthetic-secret' }, signal: new AbortController().signal };
  expect(await timedFavoritesFetch('/api/user/favorites', options)).toBe(response);
  expect(fetcher.mock.calls[0][1].signal).toBe(options.signal);
  expect(fetcher.mock.calls[0][1].headers.get('Authorization')).toBe('synthetic-secret');
  expect(fetcher.mock.calls[0][1].headers.get('X-PrepMeal-Favorites-Perf')).toBe('1');
  expect(options.headers).toEqual({ Authorization: 'synthetic-secret' });
  for (const method of ['POST', 'DELETE']) {
    const write = { ...options, method }; await timedFavoritesFetch('/api/user/favorites', write);
    expect(fetcher.mock.calls.at(-1)![1]).toBe(write);
  }
  expect(log).not.toHaveBeenCalled();
});
it('traces the actual token, headers, body and publication without adding a read, then records a fresh return', async () => {
  let tokenDone!: (s: string) => void; let headersDone!: (r: Response) => void; let bodyDone!: (s: unknown) => void;
  const getAccessToken = vi.fn(() => new Promise<string>(resolve => { tokenDone = resolve; }));
  const response = new Response('{}', { headers: { 'Server-Timing': 'handler;dur=30, auth;dur=2, db_request;dur=20' } });
  vi.spyOn(response, 'json').mockImplementation(() => new Promise(resolve => { bodyDone = resolve; }));
  const fetcher = vi.fn<typeof fetch>(() => new Promise<Response>(resolve => { headersDone = resolve; })); vi.stubGlobal('fetch', fetcher);
  const auth = { loading: false, isAuthenticated: true, user: { id: 'private-owner' }, favoritesEpoch: 3, getAccessToken };
  startNavigationMeasurement('phone', 'scope'); beginNavigationStep();
  const view = renderHook(() => useAccountFavorites(auth, { includeRecipes: true }));
  await act(async () => {}); expect(fetcher).not.toHaveBeenCalled();
  clock = 40; await act(async () => { tokenDone('private-secret'); }); expect(fetcher).toHaveBeenCalledTimes(1);
  clock = 140; await act(async () => { headersDone(response); });
  clock = 200; await act(async () => { bodyDone({ success: true, data: { favorites: [], recipes: [] } }); });
  expect(view.result.current.hasLoaded).toBe(true); clock = 220;
  navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  const first = exportNavigationMeasurement().samples[0].favorites_trace!;
  expect(first.operations.find(t => t.kind === 'page_token')).toMatchObject({ duration_ms: 40 });
  expect(first.operations.find(t => t.kind === 'read')).toMatchObject({ load_to_headers_ms: 100, body_download_parse_ms: 60, publish_to_data_ready_ms: 20, handler_ms: 30 });
  view.unmount(); clock = 230;
  beginNavigationStep(); navigationRouteCompleted('/recipes'); navigationDataReady('recipes'); beginNavigationStep();
  renderHook(() => useAccountFavorites(auth, { includeRecipes: true }));
  await act(async () => {}); clock = 240; await act(async () => { tokenDone('private-secret'); });
  navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  expect(fetcher).toHaveBeenCalledTimes(1); expect(getAccessToken).toHaveBeenCalledTimes(2);
  expect(exportNavigationMeasurement().samples[2].favorites_trace?.cache).toContainEqual({ offset_ms: 10, state: 'fresh', include: 'recipes' });
  expect(JSON.stringify(exportNavigationMeasurement())).not.toMatch(/private-owner|private-secret/);
  validateNavigationScope('other-scope'); expect(readFavoritesTrace(0, 500)).toBeUndefined();
});
it('joins a pre-click intent read when the page mounts, instead of issuing a second GET', async () => {
  let headersDone!: (r: Response) => void;
  const fetcher = vi.fn<typeof fetch>(() => new Promise<Response>(resolve => { headersDone = resolve; })); vi.stubGlobal('fetch', fetcher);
  const auth = { loading: false, isAuthenticated: true, user: { id: 'private-prefetch-owner' }, favoritesEpoch: 4, getAccessToken: vi.fn(async () => 'private-secret') };
  startNavigationMeasurement('desktop', 'scope', 'rpc');
  const intent = renderHook(() => useFavoritesPrefetch(auth));
  let pending!: Promise<boolean>; await act(async () => { pending = intent.result.current(); });
  clock = 100; beginNavigationStep();
  renderHook(() => useAccountFavorites(auth, { includeRecipes: true })); await act(async () => {});
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe('/api/user/favorites?include=recipes&read_path=rpc');
  clock = 200; await act(async () => { headersDone(new Response(JSON.stringify({ success: true, data: { favorites: [], recipes: [] } }))); await pending; });
  clock = 210; navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  expect(exportNavigationMeasurement().samples[0].favorites_trace?.operations.filter(t => t.kind === 'read')).toMatchObject([{ start_offset_ms: -100, started_before_click: true }]);
});
it.each(['rest', 'rpc'] as const)('routes only new full GETs through an explicit %s measurement', async reader => {
  startNavigationMeasurement('phone', 'scope', reader);
  const response = new Response('{}'); const fetcher = vi.fn().mockResolvedValue(response); vi.stubGlobal('fetch', fetcher);
  const options = { headers: { Authorization: 'synthetic-secret' }, signal: new AbortController().signal };
  expect(await timedFavoritesFetch('/api/user/favorites?include=recipes', options)).toBe(response);
  expect(fetcher.mock.calls[0][0]).toBe(`/api/user/favorites?include=recipes&read_path=${reader}`);
  expect(fetcher.mock.calls[0][1].signal).toBe(options.signal);
  expect(fetcher.mock.calls[0][1].headers.get('X-PrepMeal-Favorites-Perf')).toBe('1');
  expect(exportNavigationMeasurement().requested_favorites_reader).toBe(reader);
  for (const [input, init] of [
    ['/api/user/favorites', options],
    ['/api/user/favorites?include=recipes&read_path=rest', options],
    ['/api/user/favorites?include=recipes', { ...options, method: 'POST' }],
    ['/api/user/favorites?include=recipes', { ...options, method: 'DELETE' }],
  ] as const) {
    await timedFavoritesFetch(input, init); expect(fetcher.mock.calls.at(-1)![0]).toBe(input);
  }
  clearNavigationMeasurement(); await timedFavoritesFetch('/api/user/favorites?include=recipes', options);
  expect(fetcher.mock.calls.at(-1)).toEqual(['/api/user/favorites?include=recipes', options]);
});
it('invalid reader input is normalized without exporting arbitrary strings or changing normal reads', async () => {
  startNavigationMeasurement('phone', 'scope', 'private-value' as never);
  expect(exportNavigationMeasurement().requested_favorites_reader).toBe('default');
  const fetcher = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetcher);
  await timedFavoritesFetch('/api/user/favorites?include=recipes', {});
  expect(fetcher.mock.calls[0][0]).toBe('/api/user/favorites?include=recipes');
});
