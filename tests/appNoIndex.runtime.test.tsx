import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';

vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/contexts/AuthContext', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/features/performance/NavigationMeasurement', () => ({ default: () => null }));

import MyApp from '@/pages/_app';

const Page = () => <main>page</main>;
const render = (pathname: string) => renderToString(<MyApp Component={Page} pageProps={{}} router={{ pathname }} />);

describe('App robots meta', () => {
  it('adds noindex on private and diagnostics routes', () => {
    for (const route of ['/login', '/my-plans/[id]', '/admin/login', '/favorites-performance']) {
      expect(render(route), route).toContain('<meta name="robots" content="noindex"/>');
    }
  });

  it('leaves public pages indexable', () => {
    for (const route of ['/', '/recipes', '/recipes/[id]', '/generate']) {
      expect(render(route), route).not.toContain('name="robots"');
    }
  });
});
