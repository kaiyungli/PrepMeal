import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Retired legacy routes: /menu (page), /api/menus and /api/recipes/recommend,
// plus the robots.txt sitemap reference that pointed at a missing route.

const mocks = vi.hoisted(() => ({
  loadRecipeDetail: vi.fn(),
}));

vi.mock('@/features/recipes', () => ({
  loadRecipeDetail: mocks.loadRecipeDetail,
}));

import nextConfig from '../next.config';
import recommendHandler from '@/pages/api/recipes/recommend';
import recipeDetailHandler from '@/pages/api/recipes/[id]';

const root = path.resolve(__dirname, '..');
const pagesDir = path.join(root, 'src/pages');

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

// Pages Router file for a URL path, if one exists.
function pageFileFor(urlPath: string) {
  const base = path.join(pagesDir, urlPath);
  return ['.js', '.ts', '.tsx', '.jsx', '/index.js', '/index.ts']
    .map(ext => base + ext)
    .find(file => existsSync(file));
}

beforeEach(() => {
  mocks.loadRecipeDetail.mockReset();
});

describe('robots.txt sitemap reference', () => {
  it('points every Sitemap line at the real /sitemap.xml route', () => {
    const robots = readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
    const sitemaps = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map(m => new URL(m[1]));

    expect(sitemaps.map(url => url.href)).toEqual(['https://eatwhathk.com/sitemap.xml']);
    for (const url of sitemaps) {
      expect(pageFileFor(url.pathname)).toBe(path.join(pagesDir, 'sitemap.xml.js'));
    }
  });
});

describe('/menu retirement', () => {
  it('permanently redirects /menu to /generate', async () => {
    const redirects = await nextConfig.redirects!();

    expect(redirects.filter(r => r.source === '/menu')).toEqual([
      { source: '/menu', destination: '/generate', permanent: true },
    ]);
  });

  it('no longer has a /menu page, while /generate still exists', () => {
    expect(pageFileFor('/menu')).toBeUndefined();
    expect(pageFileFor('/generate')).toBe(path.join(pagesDir, 'generate.js'));
  });
});

describe('/api/menus retirement', () => {
  it('has no implementation, while the canonical /api/user/menus remains', () => {
    expect(pageFileFor('/api/menus')).toBeUndefined();
    expect(pageFileFor('/api/user/menus')).toBe(path.join(pagesDir, 'api/user/menus/index.js'));
  });
});

describe('/api/recipes/recommend retirement', () => {
  it('returns 404 without touching recipe data', async () => {
    for (const query of [{}, { ingredients: 'egg' }, { ingredients: ['egg', 'tomato'] }]) {
      const res = response();
      await recommendHandler({ method: 'GET', query, headers: {} } as never, res as never);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    }
    expect(mocks.loadRecipeDetail).not.toHaveBeenCalled();
  });

  // Why the static route stays: [id] treats any segment as an id-or-slug, so
  // without it a recipe slugged "recommend" would answer the retired URL.
  it('is needed because [id] would serve a recipe slugged "recommend"', async () => {
    mocks.loadRecipeDetail.mockResolvedValue({ recipe: { id: 'r1', slug: 'recommend' }, error: null });
    const res = response();
    await recipeDetailHandler({ method: 'GET', query: { id: 'recommend' }, headers: {} } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(mocks.loadRecipeDetail).toHaveBeenCalledWith('recommend', null);
  });
});
