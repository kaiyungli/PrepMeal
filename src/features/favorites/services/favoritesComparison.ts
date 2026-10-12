import { readBenchmarkHeaders, type BenchmarkSample } from './favoritesBenchmark';
import { observeClientTiming } from './favoritesClientTiming';
export type ComparisonSample = BenchmarkSample & { read_path: 'rest' | 'rpc'; block: number; position: number };
export const COMPARISON_SAMPLES = 24;
type Options = {
  getToken: () => Promise<string | null>; isCurrent: () => boolean; signal: AbortSignal;
  onSample: (sample: ComparisonSample) => void; onPhase: (label: string) => void;
};
// Canonicalize only in memory. Nothing from a recipe/account is exported.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).sort().join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export async function runFavoritesComparison(options: Options) {
  const check = () => { if (options.signal.aborted || !options.isCurrent()) throw new Error('量度已停止'); };
  let baseline: string | undefined;
  const read = async (read_path: ComparisonSample['read_path'], block: number, position: number) => {
    check();
    const controller = new AbortController();
    const stop = () => controller.abort();
    options.signal.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(stop, 15_000);
    let observation: ReturnType<typeof observeClientTiming> | undefined;
    let rejectAbort!: () => void;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = () => reject(new Error(options.signal.aborted ? '量度已停止' : '請求逾時，請重試'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    try {
      return await Promise.race([aborted, (async () => {
        const token = await options.getToken(); check();
        if (controller.signal.aborted) throw new Error('量度已停止');
        if (!token) throw new Error('登入已失效，請重新登入');
        const started = performance.now();
        const url = '/api/user/favorites?include=recipes&read_path=' + read_path;
        observation = observeClientTiming(url, started);
        const response = await fetch(url, {
          method: 'GET', cache: 'no-store', signal: controller.signal,
          headers: { Authorization: 'Bearer ' + token, 'X-PrepMeal-Favorites-Perf': '1' },
        });
        const headersAt = performance.now(); const headers_ms = headersAt - started;
        if (!response.ok) throw new Error(response.status === 401 ? '登入已失效，請重新登入' :
          response.status === 503 ? 'RPC 對照尚未啟用' : '對照讀取失敗，請重試');
        if (response.headers.get('X-PrepMeal-Favorites-Read-Path') !== read_path) throw new Error('未能確認讀取路徑，量度已停止');
        const body = await response.json().catch(() => { throw new Error('收藏回應不完整，請重試'); }); check();
        if (controller.signal.aborted) throw new Error('量度已停止');
        if (!body?.success || !Array.isArray(body?.data?.favorites) || !Array.isArray(body?.data?.recipes)) throw new Error('收藏回應不完整，請重試');
        // Fix duration before correctness work, so canonicalization is not transport time.
        const bodyAt = performance.now(); const complete_ms = bodyAt - started;
        const snapshot = canonical({ favorites: body.data.favorites, recipes: body.data.recipes });
        if (baseline !== undefined && snapshot !== baseline) throw new Error('兩條路徑內容不同或收藏已改變，量度已停止');
        baseline = snapshot;
        const sample: ComparisonSample = { phase: 'consecutive', read_path, block, position, status: response.status,
          headers_ms: Math.round(headers_ms * 100) / 100, complete_ms: Math.round(complete_ms * 100) / 100,
          client: observation.read(headersAt, bodyAt, response.headers),
          ...readBenchmarkHeaders(response.headers) };
        return sample;
      })()]);
    } finally {
      observation?.stop();
      clearTimeout(timer); options.signal.removeEventListener('abort', stop);
      controller.signal.removeEventListener('abort', rejectAbort);
    }
  };
  for (let block = 1; block <= 6; block++) {
    check(); options.onPhase('比較第 ' + block + '/6 組…');
    const order: ComparisonSample['read_path'][] = block % 2 ? ['rest', 'rpc', 'rpc', 'rest'] : ['rpc', 'rest', 'rest', 'rpc'];
    const pending: ComparisonSample[] = [];
    for (let position = 1; position <= 4; position++) pending.push(await read(order[position - 1], block, position));
    // Publish only complete blocks with both paths and matching payloads.
    for (const sample of pending) { check(); options.onSample(sample); }
  }
  options.onPhase('對照完成，可以匯出結果');
}
