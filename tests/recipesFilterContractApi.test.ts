// Canonical Filter Contract v1 coverage for the /api/recipes route itself.
//
// This asserts on the actual Supabase REST query the handler builds (same
// technique as tests/recipesDietFilterApi.test.ts), so a regression here -
// reintroducing the seafood->fish/shrimp expansion, or flavor containment
// instead of overlap - fails a real request built by the handler, not a
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

describe('GET /api/recipes protein filtering - primary_protein siblings, no seafood expansion', () => {
  it('requests only the literally-selected primary_protein value for a single selection', async () => {
    const res = response();
    await handler({ method: 'GET', query: { protein: 'seafood' } } as never, res as never);

    expect(requestedUrl().searchParams.get('primary_protein')).toBe('in.(seafood)');
    expect(res.statusCode).toBe(200);
  });

  it('never expands seafood to include fish/shrimp', async () => {
    const res = response();
    await handler({ method: 'GET', query: { protein: 'seafood' } } as never, res as never);

    const requested = requestedUrl().searchParams.get('primary_protein');
    expect(requested).not.toContain('fish');
    expect(requested).not.toContain('shrimp');
    expect(requested).toBe('in.(seafood)');
  });

  it('unions exactly the selected sibling values (same-group OR) with no implicit third value', async () => {
    const res = response();
    await handler({ method: 'GET', query: { protein: 'fish,shrimp' } } as never, res as never);

    expect(requestedUrl().searchParams.get('primary_protein')).toBe('in.(fish,shrimp)');
  });

  it('does not add a protein filter when only empty values are selected', async () => {
    const res = response();
    await handler({ method: 'GET', query: { protein: ' , , ' } } as never, res as never);

    expect(requestedUrl().searchParams.has('primary_protein')).toBe(false);
  });
});

describe('GET /api/recipes flavor filtering - same-group OR (overlap), not containment', () => {
  it('uses array-overlap (ANY selected flavor), matching diet\'s operator', async () => {
    const res = response();
    await handler({ method: 'GET', query: { flavor: 'sweet,spicy' } } as never, res as never);

    expect(requestedUrl().searchParams.get('flavor')).toBe('ov.{sweet,spicy}');
  });

  it('does not add a flavor filter when only empty values are selected', async () => {
    const res = response();
    await handler({ method: 'GET', query: { flavor: ' , , ' } } as never, res as never);

    expect(requestedUrl().searchParams.has('flavor')).toBe(false);
  });
});
