import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkJsonEndpoint, waitForServer } from '../scripts/smokeChecks.mjs';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('smoke failure detection', () => {
  it('rejects API 500 immediately, even for valid JSON', async () => {
    const fetch = vi.fn(async () => new Response('{"error":"database unavailable"}', { status: 500 }));
    vi.stubGlobal('fetch', fetch);
    await expect(waitForServer('http://localhost')).rejects.toThrow('HTTP 500');
    await expect(checkJsonEndpoint('http://localhost', '/api/recipes', [200])).rejects.toThrow('returned 500');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects non-JSON 200 responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>error</html>')));
    await expect(checkJsonEndpoint('http://localhost', '/api/recipes', [200])).rejects.toThrow('valid JSON');
  });
  it('accepts recipes 200 and unauthenticated admin 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response('{}', { status: url.endsWith('/api/admin/check') ? 401 : 200 })));
    await expect(waitForServer('http://localhost')).resolves.toBeUndefined();
    await expect(checkJsonEndpoint('http://localhost', '/api/recipes', [200])).resolves.toBeUndefined();
    await expect(checkJsonEndpoint('http://localhost', '/api/admin/check', [200, 401])).resolves.toBeUndefined();
  });
  it('retries a connection error but stops at a bounded deadline', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValue(new Error('connection refused'));
    vi.stubGlobal('fetch', fetch);
    const pending = expect(waitForServer('http://localhost', { timeoutMs: 500 })).rejects.toThrow('Timed out');
    await vi.advanceTimersByTimeAsync(750);
    await pending;
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('stops when the child server exits', async () => {
    await expect(waitForServer('http://localhost', { isRunning: () => false })).rejects.toThrow('server exited');
  });
});
