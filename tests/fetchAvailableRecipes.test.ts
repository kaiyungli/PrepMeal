// Client side of the Generate complete-catalogue contract: one request,
// verify before use, cache only verified catalogues under the v3 key.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAvailableRecipes } from '@/features/generate/services/fetchAvailableRecipes';

const V3 = 'generate_recipes_v3';
const V2 = 'generate_recipes_v2';
const CONTRACT = 'generate-complete-catalogue-v1';

const recipe = (i: number) => ({ id: `r${i}`, name: `Recipe ${i}`, budget_level: 'normal', meal_role: 'protein_main' });
const recipes = (n: number) => Array.from({ length: n }, (_, i) => recipe(i));

let store: Map<string, string>;

function stubFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function cached() {
  const raw = store.get(V3);
  return raw ? JSON.parse(raw) : null;
}

function seedV3(payload: Record<string, unknown>) {
  store.set(V3, JSON.stringify(payload));
}

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('window', {});
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('fetchAvailableRecipes - complete catalogue request', () => {
  it('makes exactly one Generate catalogue request', async () => {
    const fetchMock = stubFetch({ recipes: recipes(3), total: 3, complete: true });
    await fetchAvailableRecipes();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('/api/recipes?view=generate');
  });

  it('returns the recipes of a valid complete response unchanged', async () => {
    const pool = recipes(3);
    stubFetch({ recipes: pool, total: 3, complete: true });
    expect(await fetchAvailableRecipes()).toEqual(pool);
  });

  it('delivers a 250-recipe catalogue intact (no 200 ceiling)', async () => {
    const pool = recipes(250);
    const fetchMock = stubFetch({ recipes: pool, total: 250, complete: true });
    const result = await fetchAvailableRecipes();
    expect(result).toHaveLength(250);
    expect(result).toEqual(pool);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('accepts numeric ids including 0 alongside string ids', async () => {
    const pool = [{ id: 0 }, { id: 7 }, { id: 'r1' }];
    stubFetch({ recipes: pool, total: 3, complete: true });
    expect(await fetchAvailableRecipes()).toEqual(pool);
  });

  it('accepts an empty complete catalogue', async () => {
    stubFetch({ recipes: [], total: 0, complete: true });
    expect(await fetchAvailableRecipes()).toEqual([]);
  });
});

describe('fetchAvailableRecipes - rejects anything unverifiable', () => {
  it.each([
    ['complete missing', { recipes: recipes(2), total: 2 }],
    ['complete false', { recipes: recipes(2), total: 2, complete: false }],
    ['complete truthy but not true', { recipes: recipes(2), total: 2, complete: 'true' }],
    ['length below total', { recipes: recipes(2), total: 3, complete: true }],
    ['length above total', { recipes: recipes(3), total: 2, complete: true }],
    ['total missing', { recipes: recipes(2), complete: true }],
    ['total negative', { recipes: [], total: -1, complete: true }],
    ['total non-integer', { recipes: recipes(2), total: 2.5, complete: true }],
    ['recipes not an array', { recipes: null, total: 0, complete: true }],
    ['duplicate ids', { recipes: [recipe(1), recipe(1)], total: 2, complete: true }],
    ['missing id', { recipes: [recipe(1), { name: 'no id' }], total: 2, complete: true }],
    ['empty id', { recipes: [{ id: '' }], total: 1, complete: true }],
    ['non-finite id', { recipes: [{ id: NaN }], total: 1, complete: true }],
    ['infinite id', { recipes: [{ id: Infinity }], total: 1, complete: true }],
    ['boolean id', { recipes: [{ id: true }], total: 1, complete: true }],
    ['object id', { recipes: [{ id: { v: 1 } }], total: 1, complete: true }],
    ['null recipe', { recipes: [null], total: 1, complete: true }],
    ['number and string forms of one id', { recipes: [{ id: 1 }, { id: '1' }], total: 2, complete: true }],
    ['null body', null],
  ])('rejects when %s, and caches nothing', async (_label, body) => {
    stubFetch(body);
    await expect(fetchAvailableRecipes()).rejects.toThrow();
    expect(store.has(V3)).toBe(false);
  });

  it('rejects on HTTP failure and caches nothing', async () => {
    stubFetch({ error: 'Generate catalogue could not be verified as complete', complete: false }, { ok: false, status: 503 });
    await expect(fetchAvailableRecipes()).rejects.toThrow('HTTP 503');
    expect(store.has(V3)).toBe(false);
  });
});

describe('fetchAvailableRecipes - v3 cache', () => {
  it('caches a verified catalogue with completeness metadata', async () => {
    const pool = recipes(4);
    stubFetch({ recipes: pool, total: 4, complete: true });
    await fetchAvailableRecipes();
    expect(cached()).toMatchObject({ contract: CONTRACT, total: 4, complete: true, recipes: pool });
    expect(typeof cached().ts).toBe('number');
  });

  it('serves a valid fresh v3 cache without touching the network', async () => {
    const pool = recipes(5);
    seedV3({ contract: CONTRACT, ts: Date.now() - 1000, total: 5, complete: true, recipes: pool });
    const fetchMock = stubFetch({ recipes: [], total: 0, complete: true });
    expect(await fetchAvailableRecipes()).toEqual(pool);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the 5-minute TTL: refetches an expired v3 cache', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    seedV3({ contract: CONTRACT, ts: Date.now() - 5 * 60 * 1000 - 1, total: 1, complete: true, recipes: recipes(1) });
    const fresh = recipes(2);
    const fetchMock = stubFetch({ recipes: fresh, total: 2, complete: true });
    expect(await fetchAvailableRecipes()).toEqual(fresh);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('still serves a v3 cache just inside the TTL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    seedV3({ contract: CONTRACT, ts: Date.now() - 5 * 60 * 1000, total: 1, complete: true, recipes: recipes(1) });
    const fetchMock = stubFetch({ recipes: [], total: 0, complete: true });
    expect(await fetchAvailableRecipes()).toEqual(recipes(1));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['unparseable JSON', 'not json{'],
    ['incomplete (length below total)', { contract: CONTRACT, ts: 0, total: 3, complete: true, recipes: recipes(2) }],
    ['complete flag missing', { contract: CONTRACT, ts: 0, total: 2, recipes: recipes(2) }],
    ['duplicate ids', { contract: CONTRACT, ts: 0, total: 2, complete: true, recipes: [recipe(1), recipe(1)] }],
    ['wrong contract marker', { contract: 'other', ts: 0, total: 2, complete: true, recipes: recipes(2) }],
    ['legacy { ts, recipes } shape', { ts: 0, recipes: recipes(2) }],
    ['future timestamp', { contract: CONTRACT, ts: 'FUTURE', total: 2, complete: true, recipes: recipes(2) }],
  ])('discards a corrupt v3 cache (%s) and refetches', async (_label, payload) => {
    const value = typeof payload === 'string'
      ? payload
      : JSON.stringify({ ...payload, ts: payload.ts === 'FUTURE' ? Date.now() + 60_000 : Date.now() });
    store.set(V3, value);
    const fresh = recipes(3);
    const fetchMock = stubFetch({ recipes: fresh, total: 3, complete: true });

    expect(await fetchAvailableRecipes()).toEqual(fresh);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(cached()).toMatchObject({ contract: CONTRACT, total: 3, complete: true });
  });

  it('ignores an old v2 cache (possibly truncated at 200)', async () => {
    store.set(V2, JSON.stringify({ ts: Date.now(), recipes: recipes(200) }));
    const fresh = recipes(250);
    const fetchMock = stubFetch({ recipes: fresh, total: 250, complete: true });

    const result = await fetchAvailableRecipes();
    expect(result).toHaveLength(250);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not cache a rejected response after discarding an expired cache', async () => {
    // Expired but well-formed cache, then an invalid network response.
    seedV3({ contract: CONTRACT, ts: Date.now() - 10 * 60 * 1000, total: 1, complete: true, recipes: recipes(1) });
    stubFetch({ recipes: recipes(2), total: 3, complete: true });
    await expect(fetchAvailableRecipes()).rejects.toThrow();
    expect(store.has(V3)).toBe(false);
  });
});
