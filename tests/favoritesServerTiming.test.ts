import { expect, it, vi } from 'vitest';
import { createFavoritesServerTiming } from '@/lib/favoritesServerTiming';
it('default requests have no timing header and retain API results', async () => {
  const json = vi.fn(); const setHeader = vi.fn(); const res = { json, setHeader };
  const timing = createFavoritesServerTiming({ headers: {} }, res);
  expect(await timing.measure('db_request', async () => 'result')).toBe('result');
  res.json({ success: true }); expect(setHeader).not.toHaveBeenCalled(); expect(res.json).toBe(json);
});
it('records only fixed numeric stages and emits them before the original json response', async () => {
  const calls: string[] = []; const json = vi.fn<(body: unknown) => void>(() => { calls.push('json'); });
  const setHeader = vi.fn<(name: string, value: string) => void>(() => { calls.push('header'); }); const res = { json, setHeader };
  const timing = createFavoritesServerTiming({ headers: { 'x-prepmeal-favorites-perf': '1' } }, res);
  await timing.measure('auth_jwks', async () => true); await timing.measure('db_request', async () => [1]);
  await timing.measure('synthetic-secret-stage', async () => true);
  const body = timing.prepare(() => ({ success: true })); res.json(body);
  expect(calls).toEqual(['header', 'header', 'json']); expect(json).toHaveBeenCalledWith(body);
  const value = setHeader.mock.calls[0][1];
  expect(value).toMatch(/^auth_jwks;dur=\d+\.\d+, db_request;dur=\d+\.\d+, response_prepare;dur=\d+\.\d+, handler;dur=\d+\.\d+$/);
  expect(value).not.toContain('secret');
});
it('opt-in reports runtime region, module age and request-local ordinals without environment data', async () => {
  vi.resetModules(); vi.stubEnv('VERCEL_REGION', 'syd1');
  try {
    const { createFavoritesServerTiming: fresh } = await import('@/lib/favoritesServerTiming');
    const first = { json: vi.fn(), setHeader: vi.fn() }; const second = { json: vi.fn(), setHeader: vi.fn() };
    const req = { headers: { 'x-prepmeal-favorites-perf': '1' } };
    fresh(req, first); fresh(req, second);
    // Complete in reverse order to test each response keeps its own ordinal.
    second.json({ success: true }); first.json({ success: true });
    const runtime = (res: typeof first) => JSON.parse(res.setHeader.mock.calls.find(([name]) => name === 'X-PrepMeal-Favorites-Runtime')![1]);
    expect(runtime(first)).toEqual({ region: 'syd1', module_age_ms: expect.any(Number), module_request: 1 });
    expect(runtime(second).module_request).toBe(2); expect(runtime(first).module_age_ms).toBeGreaterThanOrEqual(0);
    expect(Object.keys(runtime(first))).toEqual(['region', 'module_age_ms', 'module_request']);
  } finally { vi.unstubAllEnvs(); }
});
it('missing or malformed runtime region is unknown, and normal requests still count without headers', async () => {
  vi.resetModules(); vi.stubEnv('VERCEL_REGION', 'synthetic-secret');
  try {
    const { createFavoritesServerTiming: fresh } = await import('@/lib/favoritesServerTiming');
    const normal = { json: vi.fn(), setHeader: vi.fn() }; fresh({ headers: {} }, normal); normal.json({});
    expect(normal.setHeader).not.toHaveBeenCalled();
    const res = { json: vi.fn(), setHeader: vi.fn() }; fresh({ headers: { 'x-prepmeal-favorites-perf': '1' } }, res); res.json({});
    const runtime = JSON.parse(res.setHeader.mock.calls.find(([name]) => name === 'X-PrepMeal-Favorites-Runtime')![1]);
    expect(runtime.region).toBe('unknown'); expect(runtime.module_request).toBe(2);
    expect(JSON.stringify(runtime)).not.toContain('secret');
  } finally { vi.unstubAllEnvs(); }
});
it('a rejected stage preserves the original error; header failures preserve responses', async () => {
  const json = vi.fn(); const res = { json, setHeader: () => { throw new Error('sink'); } };
  const timing = createFavoritesServerTiming({ headers: { 'x-prepmeal-favorites-perf': '1' } }, res);
  const error = new Error('synthetic'); await expect(timing.measure('db_request', () => Promise.reject(error))).rejects.toBe(error);
  expect(() => res.json({ success: false })).not.toThrow(); expect(json).toHaveBeenCalledWith({ success: false });
});
