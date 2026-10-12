import { afterEach, expect, it, vi } from 'vitest';
import { timedFavoritesFetch } from '@/utils/favoritesTiming';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function browser(search: string) {
  let tick = 10;
  vi.stubGlobal('window', { location: { search }, performance: { now: () => (tick += 25) } });
}
it('is silent by default and preserves response, credentials and abort signal', async () => {
  browser(''); const log = vi.spyOn(console, 'info');
  const response = new Response('{}', { status: 200 });
  const fetcher = vi.fn().mockResolvedValue(response); vi.stubGlobal('fetch', fetcher);
  const options = { headers: { Authorization: 'synthetic-secret' }, signal: new AbortController().signal };
  expect(await timedFavoritesFetch('/api/user/favorites?recipe_id=private-id', options)).toBe(response);
  expect(fetcher).toHaveBeenCalledWith('/api/user/favorites?recipe_id=private-id', options);
  expect(log).not.toHaveBeenCalled();
});
it('opt-in timings contain only fixed metric labels, method, status and duration', async () => {
  browser('?perf=favorites'); const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })));
  await timedFavoritesFetch('/api/user/favorites?recipe_id=private-id', { method: 'POST', headers: { Authorization: 'synthetic-secret' } });
  expect(log).toHaveBeenCalledExactlyOnceWith('[favorites-perf] {"event":"request_headers","method":"POST","status":201,"duration_ms":25}');
});
it('retains the original rejection and records failed transport as status zero', async () => {
  browser('?perf=favorites'); const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  const error = new Error('synthetic'); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
  await expect(timedFavoritesFetch('/api/user/favorites', {})).rejects.toBe(error);
  expect(log).toHaveBeenCalledExactlyOnceWith('[favorites-perf] {"event":"request_headers","method":"GET","status":0,"duration_ms":25}');
});
it('a broken diagnostic sink cannot turn a successful request into a failure', async () => {
  browser('?perf=favorites'); vi.spyOn(console, 'info').mockImplementation(() => { throw new Error('sink'); });
  const response = new Response('{}'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
  expect(await timedFavoritesFetch('/api/user/favorites', {})).toBe(response);
});
it('opt-in sends the timing header and parses only fixed numeric server stages', async () => {
  browser('?perf=favorites'); const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  const response = new Response('{}', { headers: { 'Server-Timing': 'auth;dur=4, auth_jwks;dur=2, db_request;dur=40, handler;dur=45, private-id;dur=999' } });
  const fetcher = vi.fn().mockResolvedValue(response); vi.stubGlobal('fetch', fetcher);
  expect(await timedFavoritesFetch('/api/user/favorites', { headers: { Authorization: 'synthetic-token' } })).toBe(response);
  const headers = fetcher.mock.calls[0][1].headers as Headers;
  expect(headers.get('X-PrepMeal-Favorites-Perf')).toBe('1'); expect(headers.get('Authorization')).toBe('synthetic-token');
  expect(log.mock.calls[0][0]).toBe('[favorites-perf] {"event":"server_stages","method":"GET","status":200,"stages":{"auth":4,"auth_jwks":2,"db_request":40,"handler":45}}');
});
