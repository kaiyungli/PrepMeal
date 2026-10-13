// Server-only, request-scoped observations. Never serialize paths/headers/body.
import { AsyncLocalStorage } from 'node:async_hooks';
import { channel } from 'node:diagnostics_channel';

export type RestDetails = {
  version: 1; fetch_count: number; native_request_count: number;
  sent_count: number; body_read_count: number; previously_seen_socket_count: number;
  postgrest_timing_count?: number;
};
type Sink = { enabled: boolean; add: (stage: string, ms: number) => void; restDetails: (details: RestDetails) => void };
type Trace = { active: boolean; sink: Sink; details: RestDetails; fetchMs: number; bodyMs: number };
type FetchSpan = { trace: Trace; origin?: string; path?: string };
const queries = new AsyncLocalStorage<Trace>();
const fetches = new AsyncLocalStorage<FetchSpan>();
const requests = new WeakMap<object, { trace: Trace; created: number; sent?: number; headers?: number }>();
const observedSockets = new WeakSet<object>();
function add(trace: Trace, stage: string, ms: number) {
  if (!trace.active || !Number.isFinite(ms) || ms < 0) return;
  try { trace.sink.add(stage, ms); } catch { /* Optional sinks never change queries. */ }
}
function subscribe(name: string, callback: (message: Record<string, unknown>) => void) {
  channel(name).subscribe(message => { try { callback(message as Record<string, unknown>); } catch { /* Never throw inside undici. */ } });
}
subscribe('undici:request:create', ({ request }) => {
  const span = fetches.getStore(); const trace = span?.trace;
  if (!trace?.active || !request || typeof request !== 'object') return;
  const target = request as { origin?: unknown; path?: unknown };
  if (!span?.origin || typeof target.path !== 'string' || new URL(String(target.origin)).origin !== span.origin || target.path.split('?')[0] !== span.path) return;
  trace.details.native_request_count++;
  requests.set(request, { trace, created: performance.now() });
});
subscribe('undici:client:sendHeaders', ({ request, socket }) => {
  if (!request || typeof request !== 'object') return;
  const record = requests.get(request); if (!record?.trace.active || record.sent !== undefined) return;
  record.sent = performance.now(); record.trace.details.sent_count++;
  add(record.trace, 'rest_dispatch', record.sent - record.created);
  if (socket && typeof socket === 'object') {
    if (observedSockets.has(socket)) record.trace.details.previously_seen_socket_count++;
    observedSockets.add(socket);
  }
});
subscribe('undici:request:headers', ({ request }) => {
  if (!request || typeof request !== 'object') return;
  const record = requests.get(request); if (!record?.trace.active || record.headers !== undefined) return;
  record.headers = performance.now();
  if (record.sent !== undefined) add(record.trace, 'rest_wait_headers', record.headers - record.sent);
});
subscribe('undici:request:trailers', ({ request }) => {
  if (!request || typeof request !== 'object') return;
  const record = requests.get(request); if (!record) return;
  if (record.headers !== undefined) add(record.trace, 'rest_wire_body', performance.now() - record.headers);
  requests.delete(request);
});
subscribe('undici:request:error', ({ request }) => { if (request && typeof request === 'object') requests.delete(request); });

// Keep the default fetch/pool, credentials, signal and original Response. Only
// diagnostic queries observe the text() call used by the installed SDK.
export async function favoritesRestFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const trace = queries.getStore();
  if (!trace?.active) return fetch(input, init);
  trace.details.fetch_count++;
  const span: FetchSpan = { trace };
  try {
    const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    span.origin = target.origin; span.path = target.pathname;
  } catch { /* Unidentifiable transports have no native coverage. */ }
  const started = performance.now();
  let response: Response;
  try { response = await fetches.run(span, () => fetch(input, init)); }
  finally {
    const ms = performance.now() - started; trace.fetchMs += ms; add(trace, 'rest_fetch_headers', ms);
  }
  // Observe only already-present upstream timings; never request plans or change
  // PostgREST configuration. Its "plan" is API query generation, not PG planning.
  try {
    const parts = (response.headers.get('Server-Timing') || '').split(',');
    let observed = false;
    for (const key of ['jwt', 'parse', 'plan', 'transaction', 'response']) {
      const part = parts.find(p => p.split(';')[0].trim() === key);
      const match = part?.match(/;\s*dur\s*=\s*(\d+(?:\.\d+)?)\s*(?:;|$)/);
      if (!match) continue;
      const ms = Number(match[1]);
      if (!Number.isFinite(ms) || ms > 60_000) continue;
      add(trace, `pgrst_${key}`, ms); observed = true;
    }
    if (observed) trace.details.postgrest_timing_count = (trace.details.postgrest_timing_count || 0) + 1;
  } catch { /* Missing/broken upstream headers never change a query. */ }
  try {
    const original = response.text.bind(response);
    Object.defineProperty(response, 'text', { configurable: true, writable: true, value: async () => {
      const start = performance.now();
      try { return await original(); }
      finally {
        const ms = performance.now() - start; trace.bodyMs += ms; trace.details.body_read_count++;
        add(trace, 'rest_body_read', ms);
      }
    } });
  } catch { /* An unwrappable Response remains usable; coverage reports zero. */ }
  return response;
}
export async function measureFavoritesRest<T>(sink: Sink, work: () => PromiseLike<T> | T): Promise<T> {
  if (!sink.enabled) return await work();
  const trace: Trace = { active: true, sink, fetchMs: 0, bodyMs: 0,
    details: { version: 1, fetch_count: 0, native_request_count: 0, sent_count: 0, body_read_count: 0, previously_seen_socket_count: 0, postgrest_timing_count: 0 } };
  const started = performance.now();
  try { return await queries.run(trace, async () => await work()); }
  finally {
    // Residual includes SDK setup/JSON parsing/scheduling; not pure parse time.
    if (trace.details.fetch_count > 0 && trace.details.body_read_count === trace.details.fetch_count) {
      add(trace, 'rest_sdk_gap', Math.max(0, performance.now() - started - trace.fetchMs - trace.bodyMs));
    }
    trace.active = false;
    try { sink.restDetails({ ...trace.details }); } catch { /* Preserve original query outcome. */ }
  }
}
