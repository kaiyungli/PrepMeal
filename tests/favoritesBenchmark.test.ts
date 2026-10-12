import { afterEach, expect, it, vi } from 'vitest';
import { benchmarkSummary, IDLE_MS, readBenchmarkHeaders, runFavoritesBenchmark } from '@/features/favorites/services/favoritesBenchmark';
const response = () => new Response(JSON.stringify({ success: true, data: { favorites: ['private-id'], recipes: [{ id: 'private-id', name: 'private-name' }] } }), {
  headers: { 'Server-Timing': 'auth;dur=1, db_request;dur=20, handler;dur=22, secret;dur=999',
    'X-PrepMeal-Favorites-Runtime': JSON.stringify({ region: 'syd1', module_age_ms: 20, module_request: 1, secret: 'private-token' }) },
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('collects 22 direct GETs around five-minute idle, refreshes token, and exports only safe fields', async () => {
  vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => response()));
  const getToken = vi.fn().mockResolvedValue('synthetic-token'); const samples: unknown[] = []; const onPhase = vi.fn();
  const job = runFavoritesBenchmark({ getToken, signal: new AbortController().signal, isCurrent: () => true, onSample: sample => samples.push(sample), onPhase });
  await vi.advanceTimersByTimeAsync(0); expect(fetch).toHaveBeenCalledTimes(11);
  getToken.mockResolvedValue('new-synthetic-token'); await vi.advanceTimersByTimeAsync(IDLE_MS); await job;
  expect(fetch).toHaveBeenCalledTimes(22); expect(getToken).toHaveBeenCalledTimes(22);
  expect(vi.mocked(fetch).mock.calls[11][1]?.headers).toMatchObject({ Authorization: 'Bearer new-synthetic-token' });
  expect(samples).toHaveLength(22); expect(JSON.stringify(samples)).not.toMatch(/private|token|secret|Authorization/);
  expect((samples[11] as { idle_ms: number }).idle_ms).toBeGreaterThanOrEqual(IDLE_MS);
});
it('abort during idle prevents every subsequent request', async () => {
  vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => response())); const controller = new AbortController();
  const job = runFavoritesBenchmark({ getToken: async () => 'token', signal: controller.signal, isCurrent: () => true, onSample: vi.fn(), onPhase: vi.fn() });
  const rejected = expect(job).rejects.toThrow('停止'); await vi.advanceTimersByTimeAsync(0); controller.abort(); await rejected;
  await vi.advanceTimersByTimeAsync(IDLE_MS); expect(fetch).toHaveBeenCalledTimes(11);
});
it('a token arriving after account retirement cannot start a request', async () => {
  let resolve!: (token: string) => void; let current = true; vi.stubGlobal('fetch', vi.fn());
  const job = runFavoritesBenchmark({ getToken: () => new Promise(r => { resolve = r; }), signal: new AbortController().signal, isCurrent: () => current, onSample: vi.fn(), onPhase: vi.fn() });
  const rejected = expect(job).rejects.toThrow('停止'); current = false; resolve('token'); await rejected; expect(fetch).not.toHaveBeenCalled();
});
it('late replies after cancellation cannot publish samples', async () => {
  let resolve!: (reply: Response) => void; vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  const controller = new AbortController(); const onSample = vi.fn();
  const job = runFavoritesBenchmark({ getToken: async () => 'token', signal: controller.signal, isCurrent: () => true, onSample, onPhase: vi.fn() });
  const rejected = expect(job).rejects.toThrow('停止'); await Promise.resolve(); controller.abort(); await rejected;
  resolve(response()); await Promise.resolve(); expect(onSample).not.toHaveBeenCalled();
});
it('a stalled request times out without proceeding', async () => {
  vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const job = runFavoritesBenchmark({ getToken: async () => 'token', signal: new AbortController().signal, isCurrent: () => true, onSample: vi.fn(), onPhase: vi.fn() });
  const rejected = expect(job).rejects.toThrow('逾時'); await vi.advanceTimersByTimeAsync(15_000); await rejected; expect(fetch).toHaveBeenCalledTimes(1);
});
it('a stalled token lookup is cancellable before any GET', async () => {
  vi.stubGlobal('fetch', vi.fn()); const controller = new AbortController();
  const job = runFavoritesBenchmark({ getToken: () => new Promise(() => {}), signal: controller.signal, isCurrent: () => true, onSample: vi.fn(), onPhase: vi.fn() });
  const rejected = expect(job).rejects.toThrow('停止'); controller.abort(); await rejected; expect(fetch).not.toHaveBeenCalled();
});
it('unauthenticated results stop with a fixed message, without exporting the body', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private-error', { status: 401 }))); const onSample = vi.fn();
  await expect(runFavoritesBenchmark({ getToken: async () => 'token', signal: new AbortController().signal, isCurrent: () => true, onSample, onPhase: vi.fn() })).rejects.toThrow('登入已失效');
  expect(onSample).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(1);
});
it('malformed runtime data is omitted without changing safe numeric stage parsing', () => {
  expect(readBenchmarkHeaders(new Headers({ 'Server-Timing': 'auth;dur=2, handler;dur=NaN', 'X-PrepMeal-Favorites-Runtime': '{"region":"private"}' }))).toEqual({ stages: { auth: 2 } });
});
it('summary uses per-phase medians and leaves unmeasured server stages unknown', () => {
  const summary = benchmarkSummary([10, 30, 20, 100].map(headers_ms => ({ phase: 'consecutive', status: 200, headers_ms, complete_ms: headers_ms, stages: {} })));
  expect(summary[1]).toEqual({ phase: 'consecutive', count: 4, headers_ms: 25, auth_ms: null, db_ms: null });
  expect(summary[0].headers_ms).toBeNull();
});
