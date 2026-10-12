export type BenchmarkPhase = 'first' | 'consecutive' | 'after_idle' | 'after_idle_consecutive';
export type BenchmarkSample = {
  phase: BenchmarkPhase; status: number; headers_ms: number; complete_ms: number;
  idle_ms?: number; stages: Record<string, number>;
  runtime?: { region: string; module_age_ms: number; module_request: number };
};
export const IDLE_MS = 300_000;
export function benchmarkSummary(samples: BenchmarkSample[]) {
  const median = (values: number[]) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2);
    return Math.round((sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) * 100) / 100;
  };
  return (['first', 'consecutive', 'after_idle', 'after_idle_consecutive'] as BenchmarkPhase[]).map(phase => {
    const group = samples.filter(sample => sample.phase === phase);
    return { phase, count: group.length, headers_ms: median(group.map(sample => sample.headers_ms)),
      auth_ms: median(group.flatMap(sample => typeof sample.stages.auth === 'number' ? [sample.stages.auth] : [])),
      db_ms: median(group.flatMap(sample => typeof sample.stages.db_request === 'number' ? [sample.stages.db_request] : [])) };
  });
}
const STAGES = ['auth', 'auth_jwks', 'auth_get_user', 'db_request', 'response_prepare', 'handler'];
export function readBenchmarkHeaders(headers: Headers): Pick<BenchmarkSample, 'stages' | 'runtime'> {
  const stages: Record<string, number> = {};
  for (const part of (headers.get('Server-Timing') || '').split(',')) {
    const match = part.trim().match(/^([a-z_]+);dur=([\d.]+)$/);
    if (match && STAGES.includes(match[1])) {
      const value = Number(match[2]); if (Number.isFinite(value) && value >= 0) stages[match[1]] = value;
    }
  }
  try {
    const raw = JSON.parse(headers.get('X-PrepMeal-Favorites-Runtime') || 'null');
    if ((raw?.region === 'unknown' || /^[a-z]{3}\d{1,2}$/.test(raw?.region)) &&
        typeof raw.module_age_ms === 'number' && Number.isFinite(raw.module_age_ms) && raw.module_age_ms >= 0 &&
        Number.isSafeInteger(raw.module_request) && raw.module_request > 0) {
      return { stages, runtime: { region: raw.region, module_age_ms: raw.module_age_ms, module_request: raw.module_request } };
    }
  } catch { /* Ignore invalid diagnostic metadata. */ }
  return { stages };
}
const stopped = () => new Error('量度已停止');
function waitIdle(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(stopped()); return; }
    const stop = () => { clearTimeout(timer); reject(stopped()); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, IDLE_MS);
    signal.addEventListener('abort', stop, { once: true });
  });
}
export async function runFavoritesBenchmark(options: {
  getToken: () => Promise<string | null>; isCurrent: () => boolean; signal: AbortSignal;
  onSample: (sample: BenchmarkSample) => void; onPhase: (label: string) => void;
}) {
  const { signal, isCurrent } = options;
  const check = () => { if (signal.aborted || !isCurrent()) throw stopped(); };
  const read = async (phase: BenchmarkPhase, idleStart?: number) => {
    check();
    const controller = new AbortController();
    const stop = () => controller.abort(); signal.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(stop, 15_000);
    let rejectAbort!: () => void;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = () => reject(new Error(signal.aborted ? '量度已停止' : '請求逾時，請重試'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    try {
      const sample = await Promise.race([aborted, (async (): Promise<BenchmarkSample> => {
        // Bound token lookup as well as transport; cancellation cannot leave
        // the phone stuck waiting for a delayed authentication callback.
        const token = await options.getToken(); check();
        if (controller.signal.aborted) throw stopped();
        if (!token) throw new Error('登入已失效，請重新登入');
        const start = performance.now();
        const response = await fetch('/api/user/favorites?include=recipes', {
          method: 'GET', cache: 'no-store', signal: controller.signal,
          headers: { Authorization: `Bearer ${token}`, 'X-PrepMeal-Favorites-Perf': '1' },
        });
        const headersMs = performance.now() - start;
        if (!response.ok) throw new Error(response.status === 401 ? '登入已失效，請重新登入' : '收藏讀取失敗，請重試');
        const body = await response.json();
        if (!body?.success || !Array.isArray(body?.data?.favorites) || !Array.isArray(body?.data?.recipes)) throw new Error('收藏回應不完整，請重試');
        return { phase, status: response.status, headers_ms: Math.round(headersMs * 100) / 100,
          complete_ms: Math.round((performance.now() - start) * 100) / 100,
          ...(idleStart === undefined ? {} : { idle_ms: Math.round((start - idleStart) * 100) / 100 }),
          ...readBenchmarkHeaders(response.headers) };
      })()]);
      check(); options.onSample(sample);
    } finally {
      clearTimeout(timer); signal.removeEventListener('abort', stop);
      controller.signal.removeEventListener('abort', rejectAbort);
    }
  };
  options.onPhase('量度第一個請求…'); await read('first');
  options.onPhase('量度 10 次連續請求…');
  for (let n = 0; n < 10; n++) await read('consecutive');
  const idleStart = performance.now(); options.onPhase('閒置 5 分鐘，請保持螢幕開啟並留喺呢一頁…');
  await waitIdle(signal); check();
  options.onPhase('量度閒置後請求…'); await read('after_idle', idleStart);
  for (let n = 0; n < 10; n++) await read('after_idle_consecutive');
  options.onPhase('完成，可以匯出結果');
}
