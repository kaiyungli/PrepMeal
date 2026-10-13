import { afterEach, expect, it, vi } from 'vitest';
import { channel } from 'node:diagnostics_channel';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { favoritesRestFetch, measureFavoritesRest, type RestDetails } from '@/lib/favoritesRestTiming';
import { createFavoritesServerTiming } from '@/lib/favoritesServerTiming';
import { readBenchmarkHeaders } from '@/features/favorites/services/favoritesBenchmark';
const sink = (enabled = true) => ({ enabled, add: vi.fn(), restDetails: vi.fn() });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('normal queries retain the original Response, signal and credential options without observations', async () => {
  const response = new Response('private-body'); const fetcher = vi.fn().mockResolvedValue(response); vi.stubGlobal('fetch', fetcher);
  const options = { headers: { Authorization: 'synthetic-secret' }, signal: new AbortController().signal }; const target = 'https://example.test/private?user_id=private-id';
  const trace = sink(false);
  expect(await measureFavoritesRest(trace, () => favoritesRestFetch(target, options))).toBe(response);
  expect(fetcher).toHaveBeenCalledWith(target, options); expect(await response.text()).toBe('private-body');
  expect(trace.add).not.toHaveBeenCalled(); expect(trace.restDetails).not.toHaveBeenCalled();
});
it('diagnostic text reading preserves response identity/body and reports only durations and counts', async () => {
  const response = new Response('private-body'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response)); const trace = sink();
  expect(await measureFavoritesRest(trace, async () => {
    const result = await favoritesRestFetch('https://example.test/private?user_id=private-id', { headers: { Authorization: 'synthetic-secret' } });
    expect(result).toBe(response); return result.text();
  })).toBe('private-body');
  expect(trace.restDetails).toHaveBeenCalledWith({ version: 1, fetch_count: 1, native_request_count: 0, sent_count: 0, body_read_count: 1, previously_seen_socket_count: 0, postgrest_timing_count: 0 });
  expect(trace.add.mock.calls.map(([stage]) => stage)).toEqual(['rest_fetch_headers', 'rest_body_read', 'rest_sdk_gap']);
  expect(JSON.stringify([trace.add.mock.calls, trace.restDetails.mock.calls])).not.toMatch(/private|secret|Authorization|https/);
});
it('interleaved native callbacks retain their request owner even outside async context', async () => {
  let tick = 0; vi.spyOn(performance, 'now').mockImplementation(() => tick);
  const native: object[] = []; const replies: ((response: Response) => void)[] = [];
  vi.stubGlobal('fetch', vi.fn((input: string) => {
    const request = { origin: 'https://example.test', path: new URL(input).pathname + '?user_id=private-id', headers: 'synthetic-secret' }; native.push(request);
    channel('undici:request:create').publish({ request: { origin: 'https://unrelated.test', path: '/telemetry' } });
    channel('undici:request:create').publish({ request });
    return new Promise<Response>(resolve => replies.push(resolve));
  }));
  const a = sink(); const b = sink();
  tick = 10; const jobA = measureFavoritesRest(a, async () => (await favoritesRestFetch('https://example.test/A')).text());
  tick = 20; const jobB = measureFavoritesRest(b, async () => (await favoritesRestFetch('https://example.test/B')).text());
  const socket = {};
  tick = 30; channel('undici:client:sendHeaders').publish({ request: native[1], socket });
  tick = 50; channel('undici:client:sendHeaders').publish({ request: native[0], socket });
  tick = 70; channel('undici:request:headers').publish({ request: native[1] }); replies[1](new Response('B')); await jobB;
  tick = 100; channel('undici:request:headers').publish({ request: native[0] }); replies[0](new Response('A')); await jobA;
  expect(a.add).toHaveBeenCalledWith('rest_dispatch', 40); expect(a.add).toHaveBeenCalledWith('rest_wait_headers', 50);
  expect(b.add).toHaveBeenCalledWith('rest_dispatch', 10); expect(b.add).toHaveBeenCalledWith('rest_wait_headers', 40);
  expect(a.restDetails.mock.calls[0][0].previously_seen_socket_count).toBe(1);
  expect(b.restDetails.mock.calls[0][0].previously_seen_socket_count).toBe(0);
  expect(a.restDetails.mock.calls[0][0].native_request_count).toBe(1);
  expect(b.restDetails.mock.calls[0][0].native_request_count).toBe(1);
});
it('transport rejection and broken sinks preserve the original error and leave no active scope', async () => {
  const error = new Error('synthetic-error'); vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(error).mockResolvedValue(new Response('{}')));
  const broken = { enabled: true, add: () => { throw new Error('sink'); }, restDetails: () => { throw new Error('sink'); } };
  await expect(measureFavoritesRest(broken, () => favoritesRestFetch('https://example.test'))).rejects.toBe(error);
  const response = await favoritesRestFetch('https://example.test'); expect(await response.text()).toBe('{}');
});
it('an unwrappable response remains readable and reports missing body coverage', async () => {
  const response = Object.preventExtensions(new Response('{}')); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response)); const trace = sink();
  expect(await measureFavoritesRest(trace, async () => (await favoritesRestFetch('https://example.test')).text())).toBe('{}');
  expect(trace.restDetails.mock.calls[0][0].body_read_count).toBe(0);
  expect(trace.add.mock.calls.some(([stage]) => stage === 'rest_sdk_gap')).toBe(false);
});
it('the installed Supabase SDK produces native lifecycle and body-read coverage on a real local GET', async () => {
  const server = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.setHeader('Server-Timing', 'jwt;dur=1, parse;dur=2, plan;dur=3, transaction;dur=4, response;dur=5'); res.end('[{"recipe_id":"synthetic-recipe"}]'); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('local address');
    const client = createClient(`http://127.0.0.1:${address.port}`, 'synthetic-key', {
      global: { fetch: favoritesRestFetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const trace = sink();
    const result = await measureFavoritesRest(trace, () => client.from('user_favorites').select('recipe_id').eq('user_id', 'synthetic-user'));
    expect(result.error).toBeNull(); expect(result.data).toEqual([{ recipe_id: 'synthetic-recipe' }]);
    const details = trace.restDetails.mock.calls[0][0] as RestDetails;
    expect(details.fetch_count).toBe(1); expect(details.native_request_count).toBe(1); expect(details.sent_count).toBe(1); expect(details.body_read_count).toBe(1);
    expect(details.postgrest_timing_count).toBe(1);
    const stages = trace.add.mock.calls.map(([stage]) => stage);
    for (const stage of ['rest_dispatch', 'rest_wait_headers', 'rest_wire_body', 'rest_fetch_headers', 'rest_body_read', 'rest_sdk_gap']) expect(stages).toContain(stage);
    for (const [stage, ms] of [['jwt', 1], ['parse', 2], ['plan', 3], ['transaction', 4], ['response', 5]]) expect(trace.add).toHaveBeenCalledWith(`pgrst_${stage}`, ms);
    expect(JSON.stringify([trace.add.mock.calls, trace.restDetails.mock.calls])).not.toMatch(/synthetic-key|synthetic-user|synthetic-recipe/);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
it('forwards allowlisted upstream durations through the API and benchmark export without copying headers or payloads', async () => {
  const headers = new Headers(); const res = { json: vi.fn(), setHeader: (key: string, value: string) => headers.set(key, value) };
  const trace = createFavoritesServerTiming({ headers: { 'x-prepmeal-favorites-perf': '1' } }, res);
  const response = new Response('private-body', { headers: {
    'Server-Timing': 'jwt;dur=1, parse; dur = 2.5, plan;dur=3;desc="private-description", transaction;dur=4, response;dur=5, private-secret;dur=999',
    Authorization: 'private-token', 'X-Private': 'private-owner',
  } });
  const fetcher = vi.fn().mockResolvedValue(response); vi.stubGlobal('fetch', fetcher);
  const options = { headers: { Authorization: 'private-token' }, signal: new AbortController().signal };
  expect(await measureFavoritesRest(trace, async () => {
    const result = await favoritesRestFetch('https://example.test/private', options);
    expect(result).toBe(response); return result.text();
  })).toBe('private-body');
  res.json({ success: true }); const exported = readBenchmarkHeaders(headers);
  expect(exported.stages).toMatchObject({ pgrst_jwt: 1, pgrst_parse: 2.5, pgrst_plan: 3, pgrst_transaction: 4, pgrst_response: 5 });
  expect(exported.rest?.postgrest_timing_count).toBe(1); expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://example.test/private', options);
  expect(JSON.stringify(exported)).not.toMatch(/private-|Authorization|https/);
});
it.each(['', 'plan;dur=-1, transaction;dur=NaN, response;dur=Infinity', 'plan;dur=60001, private-stage;dur=3'])('missing or invalid upstream metrics remain unmeasured (%s)', async header => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { headers: { 'Server-Timing': header } })));
  const trace = sink(); await measureFavoritesRest(trace, async () => (await favoritesRestFetch('https://example.test')).text());
  expect(trace.restDetails.mock.calls[0][0].postgrest_timing_count).toBe(0);
  expect(trace.add.mock.calls.some(([stage]) => stage.startsWith('pgrst_'))).toBe(false);
});
