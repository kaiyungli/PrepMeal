import { beforeEach, describe, expect, it, vi } from 'vitest';

const { response, limit } = vi.hoisted(() => ({
  response: { current: {} as Record<string, unknown> },
  limit: vi.fn(),
}));

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => ({ limit }),
          }),
        }),
      }),
    }),
  },
}));

import { fetchHomeRecipeCatalog } from '@/lib/recipesServer';

describe('homepage catalogue preload fallback', () => {
  beforeEach(() => {
    limit.mockReset();
    response.current = {};
    limit.mockImplementation(() => response.current);
  });

  it('returns a complete public catalogue', async () => {
    response.current = { data: [{ id: 1 }, { id: 2 }], count: 2, error: null };
    expect(await fetchHomeRecipeCatalog()).toEqual([{ id: 1 }, { id: 2 }]);
    expect(limit).toHaveBeenCalledWith(1000);
  });

  it('falls back when the database result is truncated or missing an exact count', async () => {
    response.current = { data: [{ id: 1 }], count: 2, error: null };
    expect(await fetchHomeRecipeCatalog()).toBeNull();
    response.current = { data: [{ id: 1 }], count: null, error: null };
    expect(await fetchHomeRecipeCatalog()).toBeNull();
  });

  it('falls back on a database error or thrown exception', async () => {
    response.current = { data: [], count: 0, error: { message: 'failed' } };
    expect(await fetchHomeRecipeCatalog()).toBeNull();
    limit.mockImplementation(() => { throw new Error('network failure'); });
    expect(await fetchHomeRecipeCatalog()).toBeNull();
  });
});
