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

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function requestedUrl() {
  expect(mocks.fetch).toHaveBeenCalledOnce();
  const input = mocks.fetch.mock.calls[0][0] as string | Request;
  return new URL(typeof input === 'string' ? input : input.url);
}

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify([{ id: 'matching-recipe' }]), {
    status: 200,
    headers: { 'content-type': 'application/json', 'content-range': '0-0/1' },
  }));
});

describe('GET /api/recipes diet filtering', () => {
  it('requests recipes with any selected diet tag while preserving pagination', async () => {
    const res = response();
    await handler({ method: 'GET', query: { diet: ' vegetarian , low_calorie ', page: '2', limit: '24' } } as never, res as never);

    const url = requestedUrl();
    expect(url.searchParams.get('diet')).toBe('ov.{vegetarian,low_calorie}');
    expect(url.searchParams.get('is_public')).toBe('eq.true');
    expect(url.searchParams.get('offset')).toBe('24');
    expect(url.searchParams.get('limit')).toBe('24');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ recipes: [{ id: 'matching-recipe' }], total: 1 });
  });

  it('keeps a single selected tag as an exact array-overlap filter on the generate view', async () => {
    const res = response();
    await handler({ method: 'GET', query: { diet: 'egg_lacto', view: 'generate' } } as never, res as never);

    expect(requestedUrl().searchParams.get('diet')).toBe('ov.{egg_lacto}');
    expect(res.statusCode).toBe(200);
  });

  it('does not add a diet filter when only empty values are selected', async () => {
    const res = response();
    await handler({ method: 'GET', query: { diet: ' , , ' } } as never, res as never);

    expect(requestedUrl().searchParams.has('diet')).toBe(false);
    expect(res.statusCode).toBe(200);
  });
});
