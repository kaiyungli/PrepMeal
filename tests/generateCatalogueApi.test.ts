// Generate complete-catalogue contract for GET /api/recipes?view=generate.
//
// Backs the handler with a fake PostgREST that honours offset/limit and the
// exact-count content-range header, so internal pagination, ordering and the
// completeness invariants are exercised through real supabase-js requests.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock('@/lib/supabaseServer', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    supabaseServer: createClient('https://example.supabase.co', 'anon-key', {
      global: { fetch: mocks.fetch },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
});

import handler from '@/pages/api/recipes/index';

type Row = { id: string; created_at: string };
type Body = { recipes: Array<Row & Record<string, unknown>>; total?: number; complete?: boolean; hasMore?: boolean; reason?: string };

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown as Body,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body as Body; return this; },
  };
}

// Newest first: row 0 has the latest created_at.
function catalogue(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${String(i).padStart(5, '0')}`,
    created_at: new Date(Date.UTC(2026, 0, 1) + (n - i) * 60_000).toISOString(),
  }));
}

function requestUrl(input: string | Request) {
  return new URL(typeof input === 'string' ? input : input.url);
}

interface Page { rows: unknown[]; total: number | null; from: number }
type PageHook = (page: Page, call: number) => Page | Response;
interface ServeOptions {
  // Simulates a PostgREST project max_rows: never return more rows per request.
  maxRows?: number;
  // Per-request delay (ms), to control response arrival order.
  delayMs?: (from: number) => number;
}

// Serves `rows` like PostgREST; `hook` may rewrite any page to simulate
// snapshot changes or errors, `maxRows` simulates a backend row ceiling.
function serve(rows: object[], hook?: PageHook, options: ServeOptions = {}) {
  let call = 0;
  mocks.fetch.mockImplementation(async (input: string | Request) => {
    const url = requestUrl(input);
    const from = Number(url.searchParams.get('offset') ?? 0);
    const requested = Number(url.searchParams.get('limit') ?? rows.length);
    const limit = Math.min(requested, options.maxRows ?? Infinity);
    const delay = options.delayMs?.(from) ?? 0;
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    let page: Page | Response = { rows: rows.slice(from, from + limit), total: rows.length, from };
    if (hook) page = hook(page, call++);
    if (page instanceof Response) return page;
    const end = page.from + page.rows.length - 1;
    const range = page.rows.length ? `${page.from}-${end}` : '*';
    return new Response(JSON.stringify(page.rows), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'content-range': `${range}/${page.total ?? '*'}`,
      },
    });
  });
}

async function get(query: Record<string, string>) {
  const res = response();
  await handler({ method: 'GET', query } as never, res as never);
  return res;
}

function requestedUrls() {
  return mocks.fetch.mock.calls.map(([input]) => requestUrl(input as string | Request));
}

beforeEach(() => {
  mocks.fetch.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/recipes?view=generate - complete catalogue contract', () => {
  it('returns a complete small catalogue', async () => {
    const rows = catalogue(3);
    serve(rows);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ recipes: rows, total: 3, complete: true, hasMore: false });
  });

  it.each([100, 200])('handles an exact page boundary of %i recipes without an extra or missing page', async (n) => {
    const rows = catalogue(n);
    serve(rows);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body.recipes).toEqual(rows);
    expect(mocks.fetch).toHaveBeenCalledTimes(n / 100);
  });

  it('ignores client limit/page/offset/sort as completeness controls', async () => {
    const rows = catalogue(150);
    serve(rows);
    const res = await get({ view: 'generate', limit: '5', page: '3', offset: '40', sort: 'oldest' });

    expect(res.statusCode).toBe(200);
    expect(res.body.complete).toBe(true);
    expect(res.body.total).toBe(150);
    expect(res.body.recipes).toEqual(rows);
    const urls = requestedUrls();
    expect(urls.map(u => u.searchParams.get('offset')).sort()).toEqual(['0', '100']);
    for (const url of urls) {
      expect(url.searchParams.get('order')).toBe('created_at.desc.nullslast,id.desc');
    }
  });

  it('returns more than 100 recipes completely', async () => {
    const rows = catalogue(101);
    serve(rows);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body.recipes).toHaveLength(101);
    expect(res.body.recipes.at(-1)).toEqual(rows[100]);
  });

  it('returns 250 recipes completely (no 200 ceiling)', async () => {
    const rows = catalogue(250);
    serve(rows);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ recipes: rows, total: 250, complete: true, hasMore: false });
  });

  it('assembles many internal pages in canonical order (no 1000 ceiling)', async () => {
    const rows = catalogue(1234);
    serve(rows);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1234);
    expect(res.body.recipes.map(r => r.id)).toEqual(rows.map(r => r.id));
    const offsets = requestedUrls().map(u => Number(u.searchParams.get('offset'))).sort((a, b) => a - b);
    expect(offsets).toEqual(Array.from({ length: 13 }, (_, i) => i * 100));
    for (const url of requestedUrls()) {
      expect(url.searchParams.get('limit')).toBe('100');
      expect(url.searchParams.get('is_public')).toBe('eq.true');
    }
  });

  it('keeps the exact count request and generate field list', async () => {
    serve(catalogue(1));
    await get({ view: 'generate' });
    const [input, init] = mocks.fetch.mock.calls[0] as [string | Request, RequestInit | undefined];
    const url = requestUrl(input);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    expect(headers.get('prefer')).toContain('count=exact');
    expect(url.searchParams.get('select')).toContain('meal_role');
    expect(url.searchParams.get('select')).toContain('budget_level');
  });

  it('still honours filters, verifying completeness against the filtered count', async () => {
    serve(catalogue(2));
    const res = await get({ view: 'generate', diet: 'egg_lacto' });
    expect(requestedUrls()[0].searchParams.get('diet')).toBe('ov.{egg_lacto}');
    expect(res.body.complete).toBe(true);
  });

  it('returns an empty complete catalogue when there are no public recipes', async () => {
    serve([]);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ recipes: [], total: 0, complete: true, hasMore: false });
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it('never reports complete when a page boundary duplicates a recipe', async () => {
    const rows = catalogue(150);
    // Page 2 repeats the last row of page 1 (a publish shifted offsets) on every attempt.
    serve(rows, page => page.from === 100 ? { ...page, rows: [rows[99], ...page.rows.slice(0, -1)] } : page);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(503);
    expect(res.body.complete).toBe(false);
    expect(res.body).not.toHaveProperty('recipes');
  });

  it('never reports complete when rows are missing (short page / row ceiling)', async () => {
    const rows = catalogue(150);
    serve(rows, page => page.from === 100 ? { ...page, rows: page.rows.slice(1) } : page);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(503);
    expect(res.body.complete).toBe(false);
  });

  it.each([
    [150, 50, ['0', '50', '100']],
    [250, 50, ['0', '50', '100', '150', '200']],
    [101, 50, ['0', '50', '100']],
    [100, 50, ['0', '50']],
    [7, 3, ['0', '3', '6']],
  ])('adapts to a backend row ceiling: %i recipes with max_rows %i', async (n, maxRows, offsets) => {
    const rows = catalogue(n);
    serve(rows, undefined, { maxRows });
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ recipes: rows, total: n, complete: true, hasMore: false });
    expect(new Set(res.body.recipes.map(r => r.id)).size).toBe(n);
    const urls = requestedUrls();
    expect(urls.map(u => u.searchParams.get('offset')).sort((a, b) => Number(a) - Number(b))).toEqual(offsets);
    // The probe asks for the requested page size; every later page asks for the discovered stride.
    expect(urls[0].searchParams.get('limit')).toBe('100');
    for (const url of urls.slice(1)) expect(url.searchParams.get('limit')).toBe(String(maxRows));
  });

  it('uses the full requested page size when the backend is not capped', async () => {
    const rows = catalogue(250);
    serve(rows);
    await get({ view: 'generate' });
    const requested = requestedUrls()
      .map(u => [Number(u.searchParams.get('offset')), u.searchParams.get('limit')] as const)
      .sort((a, b) => a[0] - b[0]);
    expect(requested).toEqual([[0, '100'], [100, '100'], [200, '100']]);
  });

  it('assembles pages in offset order even when later pages arrive first', async () => {
    const rows = catalogue(450);
    // Higher offsets respond sooner, so batch responses arrive in reverse order.
    serve(rows, undefined, { delayMs: from => from === 0 ? 0 : Math.max(1, 30 - from / 20) });
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body.recipes.map(r => r.id)).toEqual(rows.map(r => r.id));
  });

  it('never reports complete when a row is missing under a row ceiling', async () => {
    const rows = catalogue(250);
    serve(rows, page => page.from === 100 ? { ...page, rows: page.rows.slice(1) } : page, { maxRows: 50 });
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ complete: false, reason: 'page_size_mismatch' });
  });

  it('never reports complete when a page boundary duplicates a recipe under a row ceiling', async () => {
    const rows = catalogue(150);
    serve(rows, page => page.from === 50 ? { ...page, rows: [rows[49], ...page.rows.slice(0, -1)] } : page, { maxRows: 50 });
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ complete: false, reason: 'duplicate_id' });
  });

  it('never reports complete when the probe returns more rows than requested', async () => {
    const rows = catalogue(300);
    serve(rows, page => page.from === 0 ? { ...page, rows: rows.slice(0, 101) } : page);
    const res = await get({ view: 'generate' });
    expect(res.statusCode).toBe(503);
  });

  it('never loops when the probe returns no rows but the count says rows exist', async () => {
    serve(catalogue(5), page => ({ ...page, rows: [] }));
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ reason: 'page_size_mismatch' });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('fails loudly (no truncation, no retry) when the internal page budget would be exceeded', async () => {
    // max_rows 1 with 201 recipes would need 201 internal queries (> 200 budget).
    serve(catalogue(201), undefined, { maxRows: 1 });
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ complete: false, reason: 'page_budget_exceeded' });
    expect(res.body).not.toHaveProperty('recipes');
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it('stays within the page budget at exactly the limit', async () => {
    const rows = catalogue(200);
    serve(rows, undefined, { maxRows: 1 });
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body.recipes).toEqual(rows);
    expect(mocks.fetch).toHaveBeenCalledTimes(200);
  });

  it('never reports complete when the exact count is missing', async () => {
    serve(catalogue(3), page => ({ ...page, total: null }));
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(503);
    expect(res.body.complete).toBe(false);
  });

  it.each([
    ['empty string', ''],
    ['null', null],
    ['boolean', true],
    ['object', { value: 1 }],
  ])('rejects a recipe whose id is not usable (%s)', async (_label, id) => {
    serve([{ id, created_at: '2026-01-01T00:00:00Z' }]);
    const res = await get({ view: 'generate' });
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ reason: 'missing_id' });
  });

  it('rejects a recipe with no id field', async () => {
    serve([{ created_at: '2026-01-01T00:00:00Z' }]);
    const res = await get({ view: 'generate' });
    expect(res.body).toMatchObject({ reason: 'missing_id' });
  });

  it('accepts numeric ids, including 0', async () => {
    const rows = [{ id: 0 }, { id: 7 }, { id: 'r1' }];
    serve(rows);
    const res = await get({ view: 'generate' });
    expect(res.statusCode).toBe(200);
    expect(res.body.recipes).toEqual(rows);
  });

  it('treats the number 1 and the string "1" as the same recipe (duplicate)', async () => {
    serve([{ id: 1 }, { id: '1' }]);
    const res = await get({ view: 'generate' });
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ reason: 'duplicate_id' });
  });

  it('retries the whole retrieval once when totals change mid-pagination', async () => {
    const rows = catalogue(150);
    // Attempt 1: page 2 reports a different total (a recipe was unpublished).
    serve(rows, (page, call) => call === 1 ? { ...page, total: 149, rows: page.rows.slice(1) } : page);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ recipes: rows, total: 150, complete: true, hasMore: false });
    // 2 pages per attempt, 2 attempts.
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
  });

  it('retries once under a row ceiling when totals change mid-pagination', async () => {
    const rows = catalogue(150);
    // Attempt 1 (calls 0-2): the page at offset 100 reports a changed total.
    serve(rows, (page, call) => call < 3 && page.from === 100 ? { ...page, total: 151 } : page, { maxRows: 50 });
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(200);
    expect(res.body.recipes).toEqual(rows);
    expect(mocks.fetch).toHaveBeenCalledTimes(6);
  });

  it('fails the request when the retry still cannot be verified (bounded, no third attempt)', async () => {
    const rows = catalogue(150);
    serve(rows, page => page.from === 100 ? { ...page, total: 149 } : page);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ complete: false, reason: 'count_changed' });
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
  });

  it('fails closed with 500 on a query error', async () => {
    serve(catalogue(150), page => page.from === 100
      ? new Response(JSON.stringify({ message: 'boom', code: 'XX000' }), { status: 500, headers: { 'content-type': 'application/json' } })
      : page);
    const res = await get({ view: 'generate' });

    expect(res.statusCode).toBe(500);
    expect(res.body.complete).toBe(false);
    expect(res.body).not.toHaveProperty('recipes');
  });
});

describe('GET /api/recipes (non-generate) - unchanged list behaviour', () => {
  it('still clamps limit to 100', async () => {
    serve(catalogue(300));
    const res = await get({ limit: '500' });

    const url = requestedUrls()[0];
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(url.searchParams.get('limit')).toBe('100');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(res.body.recipes).toHaveLength(100);
    expect(res.body).toMatchObject({ total: 300, hasMore: true });
    expect(res.body).not.toHaveProperty('complete');
  });

  it('keeps page/offset pagination, sort and list fields', async () => {
    serve(catalogue(300));
    await get({ page: '3', limit: '24', sort: 'oldest', cuisine: 'chinese' });

    const url = requestedUrls()[0];
    expect(url.searchParams.get('offset')).toBe('48');
    expect(url.searchParams.get('limit')).toBe('24');
    expect(url.searchParams.get('order')).toBe('created_at.asc.nullslast,id.asc');
    expect(url.searchParams.get('cuisine')).toBe('in.(chinese)');
    expect(url.searchParams.get('select')).toContain('times_shown');
  });

  it('honours an explicit offset and reports hasMore false on the last page', async () => {
    serve(catalogue(130));
    const res = await get({ offset: '100', limit: '100' });

    expect(requestedUrls()[0].searchParams.get('offset')).toBe('100');
    expect(res.body.recipes).toHaveLength(30);
    expect(res.body).toMatchObject({ total: 130, hasMore: false });
  });
});
