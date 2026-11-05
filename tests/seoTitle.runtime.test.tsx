import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

import SEO from '@/components/seo/SEO';

const titleOf = (html: string) => html.match(/<title>(.*?)<\/title>/)?.[1];

describe('SEO title', () => {
  it('does not repeat the site name when a page is titled with it (home page)', () => {
    expect(titleOf(renderToStaticMarkup(<SEO title="今晚食乜" />))).toBe('今晚食乜');
  });

  it('appends the site name to any other page title', () => {
    expect(titleOf(renderToStaticMarkup(<SEO title="食譜" />))).toBe('食譜 | 今晚食乜');
  });

  it('uses the site name when no title is given', () => {
    expect(titleOf(renderToStaticMarkup(<SEO />))).toBe('今晚食乜');
  });

  it('always gives a share image, defaulting to the site card', () => {
    expect(renderToStaticMarkup(<SEO title="食譜" />)).toContain('<meta property="og:image" content="https://eatwhathk.com/og-default.png"/>');
    expect(renderToStaticMarkup(<SEO title="食譜" ogImage="https://x.test/a.jpg" />)).toContain('<meta property="og:image" content="https://x.test/a.jpg"/>');
  });
});
