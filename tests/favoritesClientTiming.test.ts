import { afterEach, expect, it, vi } from 'vitest';
import { observeClientTiming, readClientTiming } from '@/features/favorites/services/favoritesClientTiming';
const url = 'https://example.test/api/user/favorites?include=recipes&read_path=rest';
const entry = { name: url, initiatorType: 'fetch', startTime: 100, requestStart: 120,
  domainLookupStart: 100, domainLookupEnd: 105, connectStart: 105, connectEnd: 118, secureConnectionStart: 110,
  responseStart: 400, finalResponseHeadersStart: 402, responseEnd: 410, nextHopProtocol: 'h2' };
afterEach(() => vi.unstubAllGlobals());
const read = (entries = [entry], headers = new Headers({ 'x-vercel-id': 'hkg1::syd1::private-request-id' })) => {
  vi.stubGlobal('location', { href: 'https://example.test/favorites-performance' });
  return readClientTiming('/api/user/favorites?include=recipes&read_path=rest', 100, 420, 430, headers, entries);
};
it('exports fixed durations/protocol/regions and strips URL/ID/arbitrary fields', () => {
  const result = read([{ ...entry, secret: 'private-value' } as typeof entry]);
  expect(result).toEqual({ version: 1, coverage: 'matched', routing_regions: ['hkg1','syd1'],
    boundary: 'final_headers_start', protocol: 'h2', pre_request_ms: 20, dns_ms: 5, connect_ms: 13,
    tls_ms: 8, wait_response_ms: 282, receive_ms: 8, fetch_resume_gap_ms: 18, body_resume_gap_ms: 20 });
  expect(JSON.stringify(result)).not.toMatch(/private|example|user\/favorites|secret|name/);
});
it('uses first-byte boundary when newer final-header property is unsupported', () => {
  expect(read([{ ...entry, finalResponseHeadersStart: 0 }]).boundary).toBe('first_byte');
});
it('cannot select an old, unrelated, non-fetch or ambiguous request', () => {
  expect(read([{ ...entry, startTime: 99 }]).coverage).toBe('missing');
  expect(read([{ ...entry, name: url + '&other=1' }]).coverage).toBe('missing');
  expect(read([{ ...entry, initiatorType: 'xmlhttprequest' }]).coverage).toBe('missing');
  expect(read([entry,entry]).coverage).toBe('ambiguous');
});
it('invalid/restricted/out-of-order resource timestamps produce no invented durations', () => {
  for (const e of [{ ...entry, requestStart: 0 }, { ...entry, responseEnd: 450 }, { ...entry, responseStart: NaN, finalResponseHeadersStart: 0 }]) {
    const result = read([e]); expect(result.coverage).toBe('invalid'); expect(result.wait_response_ms).toBeUndefined();
  }
});
it('reused/unobserved TLS and unrecognized protocols do not imply a new connection', () => {
  const result = read([{ ...entry, secureConnectionStart: 0, connectStart: 100, connectEnd: 100,
    nextHopProtocol: 'private-protocol' }]);
  expect(result.connect_ms).toBe(0); expect(result.tls_ms).toBeUndefined(); expect(result.protocol).toBeUndefined();
});
it('unsupported browser API cannot fail a read and retains only sanitized routing regions', () => {
  vi.stubGlobal('location', { href: 'https://example.test/' }); vi.stubGlobal('performance', {});
  expect(readClientTiming(url,100,420,430,new Headers({ 'x-vercel-id':'private::syd1::private-id' })))
    .toEqual({ version: 1, coverage: 'missing', routing_regions: ['syd1'] });
});
it('request observer captures entries despite a full resource buffer and disconnects', () => {
  vi.stubGlobal('location', { href: 'https://example.test/' });
  const disconnect = vi.fn(); const takeRecords = vi.fn(() => [{ ...entry, entryType: 'resource' }]);
  const getEntriesByName = vi.fn(() => []);
  vi.stubGlobal('performance', { getEntriesByName });
  vi.stubGlobal('PerformanceObserver', class { observe = vi.fn(); takeRecords = takeRecords; disconnect = disconnect; });
  const observation = observeClientTiming(url,100);
  expect(observation.read(420,430,new Headers()).coverage).toBe('matched');
  expect(getEntriesByName).not.toHaveBeenCalled(); observation.stop(); expect(disconnect).toHaveBeenCalledOnce();
  expect(observation.read(420,430,new Headers()).coverage).toBe('missing');
});
it('unrelated observer events allow resource-buffer fallback', () => {
  vi.stubGlobal('location', { href: 'https://example.test/' });
  vi.stubGlobal('performance', { getEntriesByName: () => [{ ...entry, entryType: 'resource' }] });
  vi.stubGlobal('PerformanceObserver', class { observe() {} disconnect() {} takeRecords() { return [{ ...entry, entryType: 'resource', name: 'https://example.test/image' }]; } });
  const observation = observeClientTiming(url,100);
  expect(observation.read(420,430,new Headers()).coverage).toBe('matched'); observation.stop();
});
