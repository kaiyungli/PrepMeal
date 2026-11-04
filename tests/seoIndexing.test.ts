import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDiagnosticsPageEnabled, isNoIndexRoute } from '@/lib/seoIndexing';

describe('isNoIndexRoute', () => {
  it('marks account, admin and diagnostics routes as noindex', () => {
    for (const route of ['/login', '/profile', '/favorites', '/my-plans', '/my-plans/[id]', '/auth/callback',
      '/favorites-performance', '/admin', '/admin/login', '/admin/recipes', '/admin/ingredients']) {
      expect(isNoIndexRoute(route), route).toBe(true);
    }
  });

  it('keeps public content routes indexable', () => {
    for (const route of ['/', '/recipes', '/recipes/[id]', '/generate', '/about', '/privacy', '/terms', '/contact',
      '/faq', '/meal-plan-example', '/7-day-dinner-plan', '/administration-guide', undefined, null, '']) {
      expect(isNoIndexRoute(route as string), String(route)).toBe(false);
    }
  });
});

describe('favorites diagnostics page', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('is disabled only on the production deployment', () => {
    expect(isDiagnosticsPageEnabled('production')).toBe(false);
    expect(isDiagnosticsPageEnabled('preview')).toBe(true);
    expect(isDiagnosticsPageEnabled('development')).toBe(true);
    expect(isDiagnosticsPageEnabled(undefined)).toBe(true);
  });

  it('returns notFound from getStaticProps in production and renders on preview', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic');
    vi.stubEnv('VERCEL_ENV', 'production');
    const prod = await import('@/pages/favorites-performance');
    expect(prod.getStaticProps()).toEqual({ notFound: true });
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(prod.getStaticProps()).toEqual({ props: {} });
  });
});
