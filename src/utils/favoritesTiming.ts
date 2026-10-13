// Opt-in, browser-local timings. Never log URLs, tokens, IDs or response data.
import { favoritesTraceEnabled } from '@/features/performance/favoritesLoadTrace';
let enabledForDocument = false;
export function startFavoritesTiming(): number | null {
  try {
    if (typeof window === 'undefined') return null;
    const mode = new URLSearchParams(window.location.search).get('perf');
    if (mode === 'favorites') enabledForDocument = true;
    if (mode === 'off') enabledForDocument = false;
    // Keep explicit opt-in during SPA navigation; reload closes this diagnostic session.
    return enabledForDocument ? window.performance.now() : null;
  } catch { return null; }
}

export function finishFavoritesTiming(start: number | null, event: 'request_headers' | 'page_ready', method = 'GET', status = 0): void {
  if (start === null) return;
  try {
    console.info('[favorites-perf] ' + JSON.stringify({ event, method, status,
      duration_ms: Math.round((window.performance.now() - start) * 100) / 100 }));
  } catch { /* Diagnostics must never affect a request's result. */ }
}

// Resolves with the original Response; body parsing and error handling stay with callers.
export async function timedFavoritesFetch(input: string, init: RequestInit): Promise<Response> {
  const start = startFavoritesTiming();
  let status = 0;
  try {
    let options = init;
    if (start !== null) {
      const headers = new Headers(init.headers);
      headers.set('X-PrepMeal-Favorites-Perf', '1');
      options = { ...init, headers };
    }
    if (favoritesTraceEnabled() && (init.method || 'GET') === 'GET') {
      const headers = new Headers(options.headers);
      headers.set('X-PrepMeal-Favorites-Perf', '1');
      options = { ...options, headers };
    }
    const response = await fetch(input, options);
    status = response.status;
    if (start !== null) {
      try {
        const stages: Record<string, number> = {};
        const header = response.headers?.get('Server-Timing') || '';
        for (const stage of ['auth', 'auth_jwks', 'auth_get_user', 'db_request', 'response_prepare', 'handler',
          'rest_fetch_headers', 'rest_dispatch', 'rest_wait_headers', 'rest_wire_body', 'rest_body_read', 'rest_sdk_gap',
          'pgrst_jwt', 'pgrst_parse', 'pgrst_plan', 'pgrst_transaction', 'pgrst_response']) {
          const value = header.split(',').map(part => part.trim()).find(part => part.startsWith(stage + ';dur='));
          if (value) { const duration = Number(value.slice(stage.length + 5)); if (Number.isFinite(duration) && duration >= 0) stages[stage] = duration; }
        }
        if (Object.keys(stages).length) console.info('[favorites-perf] ' + JSON.stringify({ event: 'server_stages', method: init.method || 'GET', status, stages }));
        const rawRuntime = response.headers?.get('X-PrepMeal-Favorites-Runtime');
        if (rawRuntime) {
          const runtime = JSON.parse(rawRuntime);
          if ((runtime?.region === 'unknown' || /^[a-z]{3}\d{1,2}$/.test(runtime?.region)) &&
              typeof runtime.module_age_ms === 'number' && Number.isFinite(runtime.module_age_ms) && runtime.module_age_ms >= 0 &&
              Number.isSafeInteger(runtime.module_request) && runtime.module_request >= 1) {
            console.info('[favorites-perf] ' + JSON.stringify({ event: 'runtime', method: init.method || 'GET', status,
              region: runtime.region, module_age_ms: runtime.module_age_ms, module_request: runtime.module_request }));
          }
        }
      } catch { /* Diagnostics must not affect fetch results. */ }
    }
    return response;
  } finally {
    finishFavoritesTiming(start, 'request_headers', init.method || 'GET', status);
  }
}
