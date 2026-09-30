// Canonical Recipe Sorting Contract coverage for the /api/recipes route.
//
// Asserts on the actual Supabase REST `order` query param the handler
// builds (same technique as tests/recipesDietFilterApi.test.ts /
// tests/recipesFilterContractApi.test.ts), so a regression here -
// reintroducing PostgreSQL's direction-dependent default null ordering for
// newest/oldest - fails a real request built by the handler, not a
// hand-extracted predicate.
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

function requestedOrder() {
  expect(mocks.fetch).toHaveBeenCalledOnce();
  const input = mocks.fetch.mock.calls[0][0] as string | Request;
  const url = new URL(typeof input === 'string' ? input : input.url);
  return url.searchParams.get('order');
}

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify([{ id: 'matching-recipe' }]), {
    status: 200,
    headers: { 'content-type': 'application/json', 'content-range': '0-0/1' },
  }));
});

describe('GET /api/recipes sorting - explicit NULL LAST, no reliance on PostgreSQL defaults', () => {
  it('newest: created_at desc nullslast, then id desc', async () => {
    const res = response();
    await handler({ method: 'GET', query: { sort: 'newest' } } as never, res as never);
    expect(requestedOrder()).toBe('created_at.desc.nullslast,id.desc');
  });

  it('defaults to newest (desc nullslast, id desc) when sort is omitted', async () => {
    const res = response();
    await handler({ method: 'GET', query: {} } as never, res as never);
    expect(requestedOrder()).toBe('created_at.desc.nullslast,id.desc');
  });

  it('oldest: created_at asc nullslast, then id asc', async () => {
    const res = response();
    await handler({ method: 'GET', query: { sort: 'oldest' } } as never, res as never);
    expect(requestedOrder()).toBe('created_at.asc.nullslast,id.asc');
  });

  it('popular remains times_shown desc nullslast, then id desc (unchanged baseline)', async () => {
    const res = response();
    await handler({ method: 'GET', query: { sort: 'popular' } } as never, res as never);
    expect(requestedOrder()).toBe('times_shown.desc.nullslast,id.desc');
  });

  it('time_short remains total_time_minutes asc nullslast, then id desc (unchanged baseline)', async () => {
    const res = response();
    await handler({ method: 'GET', query: { sort: 'time_short' } } as never, res as never);
    expect(requestedOrder()).toBe('total_time_minutes.asc.nullslast,id.desc');
  });

  it('calories_low remains calories_per_serving asc nullslast, then id desc (unchanged baseline)', async () => {
    const res = response();
    await handler({ method: 'GET', query: { sort: 'calories_low' } } as never, res as never);
    expect(requestedOrder()).toBe('calories_per_serving.asc.nullslast,id.desc');
  });

  it('protein_high remains protein_g desc nullslast, then id desc (unchanged baseline)', async () => {
    const res = response();
    await handler({ method: 'GET', query: { sort: 'protein_high' } } as never, res as never);
    expect(requestedOrder()).toBe('protein_g.desc.nullslast,id.desc');
  });
});
