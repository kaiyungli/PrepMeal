import { describe, expect, it, vi } from 'vitest';

const { loadRecipeDetailMock } = vi.hoisted(() => ({ loadRecipeDetailMock: vi.fn() }));
vi.mock('@/features/recipes', () => ({ loadRecipeDetail: loadRecipeDetailMock }));
vi.spyOn(console, 'log').mockImplementation(() => {});

import detailHandler from '../src/pages/api/recipes/[id].js';

function call(id: string) {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json() { return this; },
  };
  return (detailHandler as never as (req: unknown, res: unknown) => Promise<unknown>)(
    { method: 'GET', query: { id }, headers: {} }, res,
  ).then(() => ({ status: res.statusCode, headers }));
}

describe('recipe detail API edge caching', () => {
  it('a found public recipe is cacheable at the CDN, not in the browser', async () => {
    loadRecipeDetailMock.mockResolvedValueOnce({ recipe: { id: 'r1' }, error: null });
    const { status, headers } = await call('r1');
    expect(status).toBe(200);
    expect(headers['cache-control']).toBe('public, s-maxage=300, stale-while-revalidate=86400');
    expect(headers['cache-control']).not.toMatch(/(^|[ ,])max-age=/);
  });

  it('a missing recipe is not cached', async () => {
    loadRecipeDetailMock.mockResolvedValueOnce({ recipe: null, error: 'Recipe not found' });
    const { status, headers } = await call('nope');
    expect(status).toBe(404);
    expect(headers['cache-control']).toBeUndefined();
  });
});
