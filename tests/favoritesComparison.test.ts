import { afterEach, expect, it, vi } from 'vitest';
import { runFavoritesComparison, type ComparisonSample } from '@/features/favorites/services/favoritesComparison';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const body = { success: true, data: { favorites: ['private-A', 'private-B'], recipes: [{ id: 'private-A', diet: ['vegan'] }, { id: 'private-B', flavor: ['spicy'] }] } };
function reply(path: string, data = body) { return new Response(JSON.stringify(data), { headers: {
  'X-PrepMeal-Favorites-Read-Path': path, 'Server-Timing': 'db_request;dur=10',
} }); }
function options(onSample: (sample: ComparisonSample) => void = vi.fn()) { return { getToken: vi.fn(async () => 'private-token'),
  isCurrent: () => true, signal: new AbortController().signal, onSample, onPhase: vi.fn() }; }
it('balances 24 GETs in ABBA/BAAB blocks, checks reordered payloads and exports no private data', async () => {
  const samples: ComparisonSample[] = []; const opts = options(sample => samples.push(sample));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = url.endsWith('rpc') ? 'rpc' : 'rest';
    return reply(path, path === 'rpc' ? { success: true, data: { favorites: [...body.data.favorites].reverse(), recipes: [...body.data.recipes].reverse() } } : body);
  }));
  await runFavoritesComparison(opts);
  expect(fetch).toHaveBeenCalledTimes(24); expect(opts.getToken).toHaveBeenCalledTimes(24);
  expect(samples.map(s => s.read_path).slice(0, 8)).toEqual(['rest', 'rpc', 'rpc', 'rest', 'rpc', 'rest', 'rest', 'rpc']);
  expect(samples.filter(s => s.read_path === 'rpc')).toHaveLength(12);
  expect(JSON.stringify(samples)).not.toMatch(/private|token|favorites|recipes/);
  expect(samples[23]).toMatchObject({ block: 6, position: 4 });
});
it('payload mismatch stops without publishing an incomplete block', async () => {
  let n = 0; vi.stubGlobal('fetch', vi.fn(async (url: string) => reply(url.endsWith('rpc') ? 'rpc' : 'rest',
    ++n === 2 ? { success: true, data: { favorites: [], recipes: [] } } : body)));
  const opts = options(); await expect(runFavoritesComparison(opts)).rejects.toThrow('內容不同');
  expect(fetch).toHaveBeenCalledTimes(2); expect(opts.onSample).not.toHaveBeenCalled();
});
it('missing/wrong path confirmation stops rather than measuring a REST fallback', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => reply('rpc'))); const opts = options();
  await expect(runFavoritesComparison(opts)).rejects.toThrow('讀取路徑'); expect(opts.onSample).not.toHaveBeenCalled();
});
it('disabled experiment uses a fixed message and exports no error body', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('private-error', { status: 503 })));
  const opts = options(); await expect(runFavoritesComparison(opts)).rejects.toThrow('尚未啟用'); expect(opts.onSample).not.toHaveBeenCalled();
});
it('stalled token lookup is bounded by 15 seconds and never fetches after timeout', async () => {
  vi.useFakeTimers(); let resolve!: (token: string) => void; vi.stubGlobal('fetch', vi.fn()); const opts = options();
  opts.getToken = vi.fn(() => new Promise<string>(r => { resolve = r; })); const job = runFavoritesComparison(opts);
  const rejected = expect(job).rejects.toThrow('逾時'); await vi.advanceTimersByTimeAsync(15_000); await rejected;
  resolve('private-late'); await Promise.resolve(); expect(fetch).not.toHaveBeenCalled(); expect(opts.onSample).not.toHaveBeenCalled();
});
it('late transport completion after abort cannot publish or continue', async () => {
  let resolve!: (r: Response) => void; vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  const controller = new AbortController(); const opts = { ...options(), signal: controller.signal }; const job = runFavoritesComparison(opts);
  const rejected = expect(job).rejects.toThrow('停止'); await Promise.resolve(); controller.abort(); await rejected;
  resolve(reply('rest')); await Promise.resolve(); await Promise.resolve(); expect(opts.onSample).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(1);
});
it('account retirement after a delayed token cannot query either path', async () => {
  let resolve!: (token: string) => void; let current = true; vi.stubGlobal('fetch', vi.fn()); const opts = { ...options(), isCurrent: () => current,
    getToken: () => new Promise<string>(r => { resolve = r; }) };
  const job = runFavoritesComparison(opts); const rejected = expect(job).rejects.toThrow('停止'); current = false; resolve('private-token'); await rejected;
  expect(fetch).not.toHaveBeenCalled(); expect(opts.onSample).not.toHaveBeenCalled();
});
