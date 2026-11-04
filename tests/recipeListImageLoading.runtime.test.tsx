import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import RecipeList from '@/components/RecipeList';

// Only the first card (the likely mobile LCP image) is fetched at high
// priority, the rest of the first desktop row loads eagerly, and every card
// below stays lazy.

const recipes = Array.from({ length: 6 }, (_, i) => ({
  id: `r${i}`, slug: `r${i}`, name: `食譜${i}`, image_url: `https://images.unsplash.com/photo-${i}`,
}));

function imgTag(html: string, name: string) {
  return html.match(new RegExp(`<img[^>]*alt="${name}"[^>]*>`))?.[0] ?? '';
}

describe('RecipeList image loading', () => {
  const html = renderToString(<RecipeList recipes={recipes} />);

  it('first card is eager with high fetch priority', () => {
    const tag = imgTag(html, '食譜0');
    expect(tag).toMatch(/fetchpriority="high"/i);
    expect(tag).not.toContain('loading="lazy"');
  });

  it('cards 2 to 4 are eager without high priority', () => {
    for (const i of [1, 2, 3]) {
      const tag = imgTag(html, `食譜${i}`);
      expect(tag).not.toContain('loading="lazy"');
      expect(tag).not.toMatch(/fetchpriority="high"/i);
    }
  });

  it('cards after the first row stay lazy', () => {
    for (const i of [4, 5]) expect(imgTag(html, `食譜${i}`)).toContain('loading="lazy"');
  });
});
