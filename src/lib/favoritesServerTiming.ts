import type { RestDetails } from './favoritesRestTiming';
const STAGES = new Set(['auth', 'auth_jwks', 'auth_get_user', 'db_request', 'response_prepare',
  'rest_fetch_headers', 'rest_dispatch', 'rest_wait_headers', 'rest_wire_body', 'rest_body_read', 'rest_sdk_gap']);
const moduleStarted = performance.now();
let moduleRequests = 0;
export function createFavoritesServerTiming(req: { headers?: Record<string, unknown> }, res: { json: (body: unknown) => unknown; setHeader?: (name: string, value: string) => unknown }) {
  const requestNumber = ++moduleRequests;
  const enabled = req.headers?.['x-prepmeal-favorites-perf'] === '1';
  const started = enabled ? performance.now() : 0;
  // Module age/ordinal are diagnostic hints, not a platform cold-start signal.
  const runtime = enabled ? {
    region: /^[a-z]{3}\d{1,2}$/.test(process.env.VERCEL_REGION || '') ? process.env.VERCEL_REGION : 'unknown',
    module_age_ms: Math.round((started - moduleStarted) * 100) / 100,
    module_request: requestNumber,
  } : null;
  const stages = new Map<string, number>();
  let rest: RestDetails | null = null;
  function record(stage: string, start: number) {
    if (enabled && STAGES.has(stage)) stages.set(stage, (stages.get(stage) || 0) + performance.now() - start);
  }
  if (enabled) {
    const original = res.json.bind(res);
    res.json = body => {
      try {
        const values = [...stages, ['handler', performance.now() - started] as [string, number]];
        res.setHeader?.('Server-Timing', values.map(([stage, duration]) => `${stage};dur=${duration.toFixed(2)}`).join(', '));
        res.setHeader?.('X-PrepMeal-Favorites-Runtime', JSON.stringify(runtime));
        if (rest) res.setHeader?.('X-PrepMeal-Favorites-Rest', JSON.stringify(rest));
      } catch { /* Optional diagnostics never change an API response. */ }
      return original(body);
    };
  }
  return {
    enabled,
    add(stage: string, ms: number) {
      if (enabled && STAGES.has(stage) && Number.isFinite(ms) && ms >= 0) stages.set(stage, (stages.get(stage) || 0) + ms);
    },
    restDetails(details: RestDetails) {
      if (enabled) rest = { version: 1, fetch_count: details.fetch_count, native_request_count: details.native_request_count,
        sent_count: details.sent_count, body_read_count: details.body_read_count, previously_seen_socket_count: details.previously_seen_socket_count };
    },
    async measure<T>(stage: string, work: () => PromiseLike<T> | T): Promise<T> {
      const start = enabled ? performance.now() : 0;
      try { return await work(); } finally { record(stage, start); }
    },
    prepare<T>(work: () => T): T {
      const start = enabled ? performance.now() : 0;
      try { return work(); } finally { record('response_prepare', start); }
    },
  };
}
