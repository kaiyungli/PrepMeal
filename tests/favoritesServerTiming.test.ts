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
  expect(calls).toEqual(['header', 'json']); expect(json).toHaveBeenCalledWith(body);
  const value = setHeader.mock.calls[0][1];
  expect(value).toMatch(/^auth_jwks;dur=\d+\.\d+, db_request;dur=\d+\.\d+, response_prepare;dur=\d+\.\d+, handler;dur=\d+\.\d+$/);
  expect(value).not.toContain('secret');
});
it('a rejected stage preserves the original error; header failures preserve responses', async () => {
  const json = vi.fn(); const res = { json, setHeader: () => { throw new Error('sink'); } };
  const timing = createFavoritesServerTiming({ headers: { 'x-prepmeal-favorites-perf': '1' } }, res);
  const error = new Error('synthetic'); await expect(timing.measure('db_request', () => Promise.reject(error))).rejects.toBe(error);
  expect(() => res.json({ success: false })).not.toThrow(); expect(json).toHaveBeenCalledWith({ success: false });
});
