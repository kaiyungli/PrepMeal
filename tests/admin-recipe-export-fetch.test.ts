import { describe, it, expect, vi } from 'vitest';
import { fetchAllChildRows, fetchAllRows, isValidExactCount, chunkIds, CHILD_PAGE_SIZE, RECIPE_ID_CHUNK_SIZE } from '@/lib/adminRecipeExportFetch';

// Regression coverage for the P1 fixed in this change: export.js must never
// fetch recipe_ingredients / recipe_steps with a single unpaginated
// `.in(...)` select, since PostgREST silently caps unranged responses
// (commonly at 1000 rows) and production already exceeds that on both
// tables (1,178 / 1,138 rows). These tests exercise the pure pagination
// algorithm directly, with fake fetchCount/fetchPage callbacks standing in
// for PostgREST -- no Supabase client mocking needed.

// Builds fake fetchCount/fetchPage callbacks backed by an in-memory table,
// enforcing a server-side page cap (like PostgREST's default max-rows) so a
// test can prove the algorithm never mistakes a capped response for a
// complete one.
function makeFakeTable(allRows: Array<{ id: string; recipe_id: string }>, serverPageCap = 500) {
  const calls: Array<{ kind: 'count' | 'page'; idChunk: string[]; from?: number; to?: number }> = [];

  const fetchCount = vi.fn(async (idChunk: string[]) => {
    calls.push({ kind: 'count', idChunk });
    const count = allRows.filter((r) => idChunk.includes(r.recipe_id)).length;
    return { count, error: null };
  });

  const fetchPage = vi.fn(async (idChunk: string[], from: number, to: number) => {
    calls.push({ kind: 'page', idChunk, from, to });
    const matched = allRows
      .filter((r) => idChunk.includes(r.recipe_id))
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    // Simulate a server-side hard cap (e.g. PostgREST `db-max-rows`) that can
    // return fewer rows than the requested [from, to] width, even for a
    // non-final page. Never skips rows: `from` is always where the last
    // response actually left off (the caller is responsible for that), so
    // capping here only means "more page calls than pageSize alone would
    // suggest," never a gap.
    const requestedWidth = to - from + 1;
    const width = Math.min(requestedWidth, serverPageCap);
    const data = matched.slice(from, from + width);
    return { data, error: null };
  });

  return { fetchCount, fetchPage, calls };
}

function makeRecipeIds(n: number) {
  return Array.from({ length: n }, (_, i) => `recipe-${String(i).padStart(4, '0')}`);
}

function makeChildRows(recipeIds: string[], countPerRecipe: (recipeId: string, i: number) => number, prefix: string) {
  const rows: Array<{ id: string; recipe_id: string }> = [];
  let seq = 0;
  recipeIds.forEach((recipeId, i) => {
    const n = countPerRecipe(recipeId, i);
    for (let j = 0; j < n; j += 1) {
      rows.push({ id: `${prefix}-${String(seq).padStart(6, '0')}`, recipe_id: recipeId });
      seq += 1;
    }
  });
  return rows;
}

describe('chunkIds', () => {
  it('splits into groups of at most `size`, preserving order, no drops', () => {
    const ids = Array.from({ length: 133 }, (_, i) => `id-${i}`);
    const chunks = chunkIds(ids, 50);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(50);
    expect(chunks[1]).toHaveLength(50);
    expect(chunks[2]).toHaveLength(33);
    expect(chunks.flat()).toEqual(ids);
  });

  it('defaults to RECIPE_ID_CHUNK_SIZE (<=50 per PostgREST URL-length guidance)', () => {
    expect(RECIPE_ID_CHUNK_SIZE).toBeLessThanOrEqual(50);
    const ids = Array.from({ length: RECIPE_ID_CHUNK_SIZE + 1 }, (_, i) => `id-${i}`);
    const chunks = chunkIds(ids);
    expect(chunks).toHaveLength(2);
  });
});

describe('fetchAllChildRows: production-scale regression (1,178 recipe_ingredients rows)', () => {
  it('collects every row across multiple id chunks and 500-row server pages, zero dropped/duplicated', async () => {
    expect(CHILD_PAGE_SIZE).toBeLessThanOrEqual(500);

    // 188 recipes (current prod count), 1,178 ingredient rows distributed
    // unevenly across them -- forces multiple 50-id chunks AND multiple
    // 500-row pages within chunks.
    const recipeIds = makeRecipeIds(188);
    let remaining = 1178;
    const allRows = makeChildRows(recipeIds, (_id, i) => {
      if (i === recipeIds.length - 1) return remaining; // dump the remainder on the last recipe
      const n = Math.min(remaining, i % 11); // uneven distribution
      remaining -= n;
      return n;
    }, 'ri');
    expect(allRows).toHaveLength(1178);

    const { fetchCount, fetchPage, calls } = makeFakeTable(allRows, CHILD_PAGE_SIZE);

    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage });

    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(1178);

    // Exact output, no drops or duplicates: same id multiset as the source.
    const gotIds = (result.rows as Array<{ id: string }>).map((r) => r.id).sort();
    const wantIds = allRows.map((r) => r.id).sort();
    expect(gotIds).toEqual(wantIds);
    expect(new Set(gotIds).size).toBe(gotIds.length);

    // Multiple id chunks were actually used (>=4 chunks for 188 ids / 50).
    const idChunksUsed = new Set(calls.filter((c) => c.kind === 'count').map((c) => JSON.stringify(c.idChunk)));
    expect(idChunksUsed.size).toBeGreaterThanOrEqual(4);

    // Every page request stayed within the page-size bound.
    for (const c of calls) {
      if (c.kind === 'page') {
        expect((c.to as number) - (c.from as number) + 1).toBeLessThanOrEqual(CHILD_PAGE_SIZE);
      }
    }
  });

  it('collects every row for 1,138 recipe_steps rows across chunks and pages, zero dropped/duplicated', async () => {
    const recipeIds = makeRecipeIds(188);
    let remaining = 1138;
    const allRows = makeChildRows(recipeIds, (_id, i) => {
      if (i === recipeIds.length - 1) return remaining;
      const n = Math.min(remaining, (i * 3) % 13);
      remaining -= n;
      return n;
    }, 'step');
    expect(allRows).toHaveLength(1138);

    const { fetchCount, fetchPage } = makeFakeTable(allRows, CHILD_PAGE_SIZE);
    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage });

    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(1138);
    const gotIds = (result.rows as Array<{ id: string }>).map((r) => r.id).sort();
    expect(new Set(gotIds).size).toBe(1138);
  });

  it('never treats a server-capped page as complete: a page that quietly returns fewer rows than requested still resolves fully, with no gap', async () => {
    // Server always caps a single response to at most 200 rows regardless of
    // the requested range width (e.g. a `db-max-rows` setting below our own
    // 500-row pageSize) -- but always starts exactly at the requested `from`,
    // as real PostgREST does. The algorithm must anchor the next request's
    // `from` to rows actually collected so far (not `pageCallIndex *
    // pageSize`), so no row between a short page and the next request is
    // ever skipped, and must keep looping until the exact count is reached
    // rather than stopping because a page came back shorter than requested.
    const recipeIds = makeRecipeIds(10);
    const allRows = makeChildRows(recipeIds, () => 90, 'ri'); // 900 rows total
    const { fetchCount, fetchPage, calls } = makeFakeTable(allRows, 200);

    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage, pageSize: 500 });

    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(900);
    const gotIds = (result.rows as Array<{ id: string }>).map((r) => r.id).sort();
    expect(new Set(gotIds).size).toBe(900);
    const pageCalls = calls.filter((c) => c.kind === 'page');
    // More page calls than a naive "one 500-row page per chunk" assumption
    // would need, because the 200-row server cap forces extra round trips.
    expect(pageCalls.length).toBeGreaterThan(2);
  });
});

describe('fetchAllChildRows: fail-closed on error', () => {
  it('an intermediate-page error aborts and returns an error, not a partial row set', async () => {
    const recipeIds = makeRecipeIds(5);
    const allRows = makeChildRows(recipeIds, () => 300, 'ri'); // 1500 rows, needs 3 pages of 500
    let pageCallCount = 0;
    const fetchCount = vi.fn(async (idChunk: string[]) => ({
      count: allRows.filter((r) => idChunk.includes(r.recipe_id)).length,
      error: null,
    }));
    const fetchPage = vi.fn(async (idChunk: string[], from: number, to: number) => {
      pageCallCount += 1;
      if (pageCallCount === 2) {
        return { data: null, error: { message: 'connection reset by peer' } };
      }
      const matched = allRows
        .filter((r) => idChunk.includes(r.recipe_id))
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));
      return { data: matched.slice(from, to + 1), error: null };
    });

    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage, pageSize: 500 });

    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/connection reset by peer/);
  });

  it('a count-query error aborts before any page is fetched', async () => {
    const recipeIds = makeRecipeIds(5);
    const fetchCount = vi.fn(async () => ({ count: null, error: { message: 'count query failed' } }));
    const fetchPage = vi.fn(async () => ({ data: [], error: null }));

    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage });

    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/count query failed/);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('fails closed when collected rows do not equal the expected exact count (short read)', async () => {
    const recipeIds = makeRecipeIds(3);
    const fetchCount = vi.fn(async () => ({ count: 50, error: null }));
    // The exact count says 50, but only 40 rows actually exist -- the first
    // page returns them all, and the source is then exhausted (empty page).
    // Must still be treated as a failure, never a complete 40-row export.
    let calls = 0;
    const fetchPage = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return { data: Array.from({ length: 40 }, (_, i) => ({ id: `x${i}`, recipe_id: recipeIds[0] })), error: null };
      }
      return { data: [], error: null };
    });

    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage, pageSize: 500 });

    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/Row count mismatch/);
    expect(result.error).toMatch(/expected 50/);
    expect(result.error).toMatch(/collected 40/);
  });

  it('fails closed when a page over-returns relative to the expected count (count mismatch, over-read)', async () => {
    const recipeIds = makeRecipeIds(1);
    const fetchCount = vi.fn(async () => ({ count: 5, error: null }));
    const fetchPage = vi.fn(async () => ({
      data: Array.from({ length: 7 }, (_, i) => ({ id: `x${i}`, recipe_id: recipeIds[0] })),
      error: null,
    }));

    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage, pageSize: 500 });

    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/Row count mismatch/);
  });
});

describe('isValidExactCount', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a fractional number', 12.5],
    ['NaN', NaN],
    ['-Infinity', -Infinity],
    ['a negative integer', -1],
    ['a numeric string', '12'],
    ['a boolean', true],
    ['an object', {}],
  ])('rejects %s', (_label, value) => {
    expect(isValidExactCount(value)).toBe(false);
  });

  it.each([
    ['zero', 0],
    ['a positive integer', 42],
    ['Number.MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER],
  ])('accepts %s', (_label, value) => {
    expect(isValidExactCount(value)).toBe(true);
  });
});

// R3 fix (item 2): `fetchAllChildRows` must never coerce an invalid exact
// count with `count || 0` -- that would silently treat "the count query is
// broken" as "zero rows exist" and return a spuriously-successful empty
// result instead of failing closed.
describe('fetchAllChildRows: invalid exact count (not a count-query error, but an untrustworthy count value)', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a fractional number', 12.5],
    ['a negative number', -3],
    ['NaN', NaN],
  ])('fails closed with no partial rows and no page fetch when count is %s', async (_label, count) => {
    const recipeIds = makeRecipeIds(3);
    const fetchCount = vi.fn(async () => ({ count, error: null }));
    const fetchPage = vi.fn(async () => ({ data: [], error: null }));

    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage });

    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/[Ii]nvalid.*count/);
    expect(fetchPage).not.toHaveBeenCalled();
  });
});

describe('fetchAllRows (root/non-chunked table, e.g. `recipes`)', () => {
  it('collects every row via count + range pagination, matching fetchAllChildRows semantics', async () => {
    const allRows = Array.from({ length: 250 }, (_, i) => ({ id: `r${String(i).padStart(4, '0')}` }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({ data: allRows.slice(from, to + 1), error: null }));

    const result = await fetchAllRows(allRows.length, fetchPage, { pageSize: 100 });

    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(250);
    expect((result.rows as Array<{ id: string }>).map((r) => r.id)).toEqual(allRows.map((r) => r.id));
    expect(fetchPage).toHaveBeenCalledTimes(3); // 100 + 100 + 50
  });

  it('fails closed (no partial rows) when the actual data falls short of the claimed count', async () => {
    // Simulates a server response capped below what its own exact count
    // promised -- count says 150, but only 90 rows actually exist.
    const allRows = Array.from({ length: 90 }, (_, i) => ({ id: `r${i}` }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({ data: allRows.slice(from, to + 1), error: null }));

    const result = await fetchAllRows(150, fetchPage, { pageSize: 500 });

    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/Row count mismatch/);
    expect(result.error).toMatch(/expected 150/);
    expect(result.error).toMatch(/collected 90/);
  });

  it('rejects an invalid count without ever calling fetchPage', async () => {
    const fetchPage = vi.fn();
    const result = await fetchAllRows(null, fetchPage);
    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/[Ii]nvalid.*count/);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('propagates a page error without a partial row set', async () => {
    const fetchPage = vi.fn(async () => ({ data: null, error: { message: 'network error' } }));
    const result = await fetchAllRows(10, fetchPage);
    expect(result.rows).toBeUndefined();
    expect(result.error).toMatch(/network error/);
  });
});

describe('fetchAllChildRows: edge cases', () => {
  it('returns an empty row set with zero queries when there are no recipe ids', async () => {
    const fetchCount = vi.fn();
    const fetchPage = vi.fn();
    const result = await fetchAllChildRows([], { fetchCount, fetchPage });
    expect(result.rows).toEqual([]);
    expect(fetchCount).not.toHaveBeenCalled();
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('a chunk with an exact count of zero issues no page requests', async () => {
    const recipeIds = makeRecipeIds(2);
    const fetchCount = vi.fn(async () => ({ count: 0, error: null }));
    const fetchPage = vi.fn(async () => ({ data: [], error: null }));
    const result = await fetchAllChildRows(recipeIds, { fetchCount, fetchPage });
    expect(result.rows).toEqual([]);
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
