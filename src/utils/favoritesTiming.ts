// Opt-in, browser-local timings. Never log URLs, tokens, IDs or response data.
export function startFavoritesTiming(): number | null {
  try {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('perf') !== 'favorites') return null;
    return window.performance.now();
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
    const response = await fetch(input, options);
    status = response.status;
    if (start !== null) {
      try {
        const stages: Record<string, number> = {};
        const header = response.headers?.get('Server-Timing') || '';
        for (const stage of ['auth', 'auth_jwks', 'auth_get_user', 'db_request', 'response_prepare', 'handler']) {
          const value = header.split(',').map(part => part.trim()).find(part => part.startsWith(stage + ';dur='));
          if (value) { const duration = Number(value.slice(stage.length + 5)); if (Number.isFinite(duration) && duration >= 0) stages[stage] = duration; }
        }
        if (Object.keys(stages).length) console.info('[favorites-perf] ' + JSON.stringify({ event: 'server_stages', method: init.method || 'GET', status, stages }));
      } catch { /* Diagnostics must not affect fetch results. */ }
    }
    return response;
  } finally {
    finishFavoritesTiming(start, 'request_headers', init.method || 'GET', status);
  }
}
