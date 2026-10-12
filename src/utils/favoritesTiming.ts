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
    const response = await fetch(input, init);
    status = response.status;
    return response;
  } finally {
    finishFavoritesTiming(start, 'request_headers', init.method || 'GET', status);
  }
}
