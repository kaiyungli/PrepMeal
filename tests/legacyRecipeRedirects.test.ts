import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';
import { legacyRecipeRedirects } from '../src/constants/legacyRecipeRedirects';

describe('retired recipe URLs', () => {
  it('keeps the weekly menu redirect and returns permanent recipe redirects', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: '/menu', destination: '/generate', permanent: true });
    expect(redirects).toContainEqual({ source: '/recipes/wood-ear-salad', destination: '/recipes/cold-black-fungus-xhs', permanent: true });
    expect(redirects).toHaveLength(12);
  });
  it('has no self redirects, chains or cycles', () => {
    for (const [source, destination] of Object.entries(legacyRecipeRedirects)) {
      expect(source).not.toBe(destination);
      expect(Object.hasOwn(legacyRecipeRedirects, destination)).toBe(false);
    }
  });
  it('does not substitute a different vegetable for the retired bok choy soup', () => {
    expect(legacyRecipeRedirects['baby-bok-choy-soup']).toBeUndefined();
  });
});
