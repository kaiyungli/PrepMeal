import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ rows: [] as Array<{ slug: string; updated_at: string | null }>, ranges: [] as Array<[number, number]> }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: async (from: number, to: number) => {
          db.ranges.push([from, to]);
          return { data: db.rows.slice(from, to + 1), error: null };
        },
      };
      return query;
    },
  }),
}));

import { getServerSideProps, toLastmod } from '@/pages/sitemap.xml';

async function render() {
  const res = { statusCode: 0, headers: {} as Record<string, string>, body: '',
    setHeader(name: string, value: string) { this.headers[name] = value; },
    end(body: string) { this.body = body; } };
  await getServerSideProps({ res } as never);
  return res;
}

beforeEach(() => {
  db.rows = []; db.ranges = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service';
});

describe('sitemap.xml', () => {
  it('adds lastmod from updated_at to recipe URLs', async () => {
    db.rows = [{ slug: 'tomato-egg', updated_at: '2026-10-25T07:42:28.123+00:00' }];
    const res = await render();
    expect(res.body).toContain('<loc>https://eatwhathk.com/recipes/tomato-egg</loc>\n    <lastmod>2026-10-25</lastmod>');
  });

  it('omits lastmod when the date is unknown, and on static pages', async () => {
    db.rows = [{ slug: 'no-date', updated_at: null }];
    const res = await render();
    expect(res.body).not.toContain('<lastmod>');
    expect(res.body).toContain('<loc>https://eatwhathk.com/recipes/no-date</loc>');
  });

  it('lists every public recipe instead of stopping at a fixed limit', async () => {
    db.rows = Array.from({ length: 1001 }, (_, i) => ({ slug: `r-${i}`, updated_at: '2026-11-01T00:00:00Z' }));
    const res = await render();
    expect(res.body.match(/\/recipes\/r-\d+</g)).toHaveLength(1001);
    expect(db.ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it('turns invalid timestamps into no lastmod', () => {
    expect(toLastmod('not a date')).toBe('');
    expect(toLastmod(undefined)).toBe('');
  });
});
