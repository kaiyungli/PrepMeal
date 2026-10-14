type Kind = 'page_token' | 'intent_token' | 'read';
type Trace = { kind: Kind; start: number; end?: number; headers?: number; body?: number; published?: number; status?: number; include?: 'ids' | 'recipes'; read_path?: 'rest' | 'rpc'; server?: Record<string, number> };
export type FavoritesReader = 'default' | 'rest' | 'rpc';
type Run = { reader: FavoritesReader; traces: Trace[]; cache: { at: number; state: 'fresh' | 'stale_or_missing'; include: 'ids' | 'recipes' }[] };
let run: Run | null = null;
export type FavoritesTraceHandle = { run: Run; trace: Trace } | null;
const tick = () => { try { return performance.now(); } catch { return 0; } };
const round = (n: number) => Math.round(n * 100) / 100;
export function startFavoritesTraceRun(reader: FavoritesReader = 'default') {
  run = { reader: reader === 'rest' || reader === 'rpc' ? reader : 'default', traces: [], cache: [] };
}
export function getFavoritesTraceReader(): FavoritesReader { return run?.reader ?? 'default'; }
export function clearFavoritesTraceRun() { run = null; }
export function favoritesTraceEnabled() { return run !== null; }
export function beginFavoritesTrace(kind: Kind, includeRecipes = false): FavoritesTraceHandle {
  if (!run || run.traces.length >= 100) return null;
  const trace: Trace = { kind, start: tick() };
  if (kind === 'read') trace.include = includeRecipes ? 'recipes' : 'ids';
  run.traces.push(trace); return { run, trace };
}
export function markFavoritesCache(fresh: boolean, includeRecipes: boolean) {
  if (run && run.cache.length < 100) run.cache.push({ at: tick(), state: fresh ? 'fresh' : 'stale_or_missing', include: includeRecipes ? 'recipes' : 'ids' });
}
export function markFavoritesTrace(handle: FavoritesTraceHandle, phase: 'headers' | 'body' | 'published' | 'end', response?: Response) {
  if (!handle || handle.run !== run) return;
  if (phase === 'end' && handle.trace.end !== undefined) return;
  handle.trace[phase] = tick();
  if (phase === 'headers' && response) {
    if (Number.isInteger(response.status) && response.status >= 0 && response.status <= 599) handle.trace.status = response.status;
    try {
      const path = response.headers?.get('X-PrepMeal-Favorites-Read-Path');
      if (path === 'rest' || path === 'rpc') handle.trace.read_path = path;
      const server: Record<string, number> = {};
      const header = response.headers?.get('Server-Timing') || '';
      for (const key of ['auth', 'auth_jwks', 'auth_get_user', 'db_request', 'response_prepare', 'handler',
        'rest_fetch_headers', 'rest_dispatch', 'rest_wait_headers', 'rest_wire_body', 'rest_body_read', 'rest_sdk_gap',
        'pgrst_jwt', 'pgrst_parse', 'pgrst_plan', 'pgrst_transaction', 'pgrst_response']) {
        const match = header.split(',').map(s => s.trim()).find(s => s.startsWith(`${key};dur=`));
        if (match) {
          const n = Number(match.slice(key.length + 5));
          if (Number.isFinite(n) && n >= 0 && n <= 15000) server[`${key}_ms`] = n;
        }
      }
      try {
        const raw = JSON.parse(response.headers?.get('X-PrepMeal-Favorites-Rest') || 'null');
        if (raw?.version === 1 && Number.isSafeInteger(raw.fetch_count) && raw.fetch_count >= 0 && raw.fetch_count <= 1000 &&
            Number.isSafeInteger(raw.postgrest_timing_count) && raw.postgrest_timing_count >= 0 && raw.postgrest_timing_count <= raw.fetch_count) {
          server.postgrest_timing_count = raw.postgrest_timing_count;
        }
      } catch { /* Old responses leave upstream coverage unknown. */ }
      handle.trace.server = server;
    } catch { /* Diagnostics never copy raw headers or change the response. */ }
  }
}
export function readFavoritesTrace(start: number, end: number) {
  if (!run) return undefined;
  const traces = run.traces.filter(t => t.start <= end && (t.end ?? end) >= start - 5000);
  return {
    cache: run.cache.filter(c => c.at >= start - 5000 && c.at <= end).map(c => ({ offset_ms: round(c.at - start), state: c.state, include: c.include })),
    operations: traces.map(t => ({ kind: t.kind, start_offset_ms: round(t.start - start), started_before_click: t.start < start,
      ...(t.include ? { include: t.include } : {}),
      ...(t.read_path ? { read_path: t.read_path } : {}),
      ...(t.end !== undefined && t.end <= end ? { duration_ms: round(t.end - t.start) } : { pending_at_data_ready: true }),
      ...(t.headers !== undefined && t.headers <= end ? { headers_offset_ms: round(t.headers - start), load_to_headers_ms: round(t.headers - t.start) } : {}),
      ...(t.body !== undefined && t.body <= end && t.headers !== undefined ? { body_offset_ms: round(t.body - start), body_download_parse_ms: round(t.body - t.headers) } : {}),
      ...(t.published !== undefined && t.published <= end ? { published_offset_ms: round(t.published - start), publish_to_data_ready_ms: round(end - t.published) } : {}),
      ...(t.status !== undefined ? { status: t.status } : {}), ...(t.server || {}) })),
  };
}
