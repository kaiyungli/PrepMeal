// Client-only diagnostic observations. Never export entry.name, IDs or arbitrary headers.
export type ClientTiming = {
  version: 1; coverage: 'matched' | 'missing' | 'ambiguous' | 'invalid';
  boundary?: 'final_headers_start' | 'first_byte';
  protocol?: 'h2' | 'h3' | 'http/1.1'; routing_regions?: string[];
  pre_request_ms?: number; dns_ms?: number; connect_ms?: number; tls_ms?: number;
  wait_response_ms?: number; receive_ms?: number; fetch_resume_gap_ms?: number; body_resume_gap_ms?: number;
};
type Entry = Pick<PerformanceResourceTiming, 'name' | 'initiatorType' | 'startTime' | 'requestStart' |
  'domainLookupStart' | 'domainLookupEnd' | 'connectStart' | 'connectEnd' | 'secureConnectionStart' |
  'responseStart' | 'responseEnd' | 'nextHopProtocol'> & { finalResponseHeadersStart?: number };
const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function readClientTiming(url: string, started: number, headersAt: number, bodyAt: number,
  headers: Headers, entries?: Entry[]): ClientTiming {
  const result: ClientTiming = { version: 1, coverage: 'missing' };
  // x-vercel-id includes routing regions plus an opaque ID. Drop every non-region segment.
  const regions = (headers.get('x-vercel-id') || '').split('::').filter(x => /^[a-z]{3}\d{1,2}$/.test(x));
  if (regions.length && regions.length <= 6) result.routing_regions = regions;
  try {
    const name = new URL(url, location.href).href;
    const resources: Entry[] = entries ?? performance.getEntriesByName(name, 'resource')
      .filter((entry): entry is PerformanceResourceTiming => entry.entryType === 'resource');
    const candidates = resources
      .filter(e => e.name === name && e.initiatorType === 'fetch' && valid(e.startTime) &&
        e.startTime >= started && e.startTime <= headersAt);
    if (candidates.length !== 1) { result.coverage = candidates.length ? 'ambiguous' : 'missing'; return result; }
    const e = candidates[0];
    const response = valid(e.finalResponseHeadersStart) && e.finalResponseHeadersStart > 0 ? e.finalResponseHeadersStart : e.responseStart;
    if (![started, headersAt, bodyAt, e.requestStart, response, e.responseEnd].every(valid) ||
        e.requestStart <= 0 || e.requestStart < e.startTime || response < e.requestStart ||
        e.responseEnd < response || bodyAt < headersAt || e.responseEnd > bodyAt) {
      result.coverage = 'invalid'; return result;
    }
    result.coverage = 'matched';
    result.boundary = response === e.finalResponseHeadersStart ? 'final_headers_start' : 'first_byte';
    if (['h2', 'h3', 'http/1.1'].includes(e.nextHopProtocol)) result.protocol = e.nextHopProtocol as ClientTiming['protocol'];
    const add = (key: keyof ClientTiming, end: number, start: number) => {
      if (valid(start) && valid(end) && end >= start && end - start <= 15_000) Object.assign(result, { [key]: Math.round((end - start) * 100) / 100 });
    };
    add('pre_request_ms', e.requestStart, e.startTime);
    add('wait_response_ms', response, e.requestStart);
    add('receive_ms', e.responseEnd, response);
    // These gaps include browser delivery/headers/body handling and scheduling, not pure CPU time.
    add('fetch_resume_gap_ms', headersAt, response);
    add('body_resume_gap_ms', bodyAt, e.responseEnd);
    if (valid(e.domainLookupStart) && e.domainLookupStart >= e.startTime &&
        valid(e.domainLookupEnd) && e.domainLookupEnd <= e.requestStart) add('dns_ms', e.domainLookupEnd, e.domainLookupStart);
    if (valid(e.connectStart) && e.connectStart >= e.startTime &&
        valid(e.connectEnd) && e.connectEnd <= e.requestStart) {
      add('connect_ms', e.connectEnd, e.connectStart);
      if (valid(e.secureConnectionStart) && e.secureConnectionStart > 0 && e.secureConnectionStart >= e.connectStart &&
          e.secureConnectionStart <= e.connectEnd) add('tls_ms', e.connectEnd, e.secureConnectionStart);
    }
  } catch { /* Missing browser support cannot fail a read or invent timings. */ }
  return result;
}

// Request-scoped observer survives a full global resource buffer without clearing
// or resizing the application's performance entries. Always disconnect in finally.
export function observeClientTiming(url: string, started: number) {
  let active = true; let observer: PerformanceObserver | undefined;
  const records: PerformanceResourceTiming[] = [];
  let name: string | undefined;
  const select = (entries: PerformanceEntry[]) => entries.filter((e): e is PerformanceResourceTiming =>
    e.entryType === 'resource' && e.name === name && valid(e.startTime) && e.startTime >= started);
  try {
    name = new URL(url, location.href).href;
    observer = new PerformanceObserver(list => {
      try { if (active) records.push(...select(list.getEntries())); } catch { /* Optional diagnostics. */ }
    });
    observer.observe({ type: 'resource' });
  } catch { try { observer?.disconnect(); } catch { /* Optional diagnostics. */ } observer = undefined; }
  return {
    read(headersAt: number, bodyAt: number, headers: Headers) {
      if (!active) return { version: 1, coverage: 'missing' } as ClientTiming;
      try {
        const queued = observer ? select(observer.takeRecords()) : [];
        const observed = [...records, ...queued];
        if (observed.length) {
          const result = readClientTiming(url, started, headersAt, bodyAt, headers, observed);
          if (result.coverage !== 'missing') return result;
        }
      } catch { /* Fall back to the read-only resource buffer. */ }
      return readClientTiming(url, started, headersAt, bodyAt, headers);
    },
    stop() { active = false; records.length = 0; try { observer?.disconnect(); } catch { /* Optional diagnostics. */ } },
  };
}
