import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { HOME_EXAMPLES, featuredCandidates, validHomeExample, type HomeRecipe } from '@/features/home/homeRotation';
import { HOME_EXAMPLE_COUNT, hongKongDateKey, homeExampleIndex } from '@/features/home/homeCalendar';
import { proxy } from '@/proxy';

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
export function exampleCatalogue(): HomeRecipe[] {
  const recipes = new Map<string, HomeRecipe>();
  for (const example of HOME_EXAMPLES) for (const day of example.days) day.slugs.forEach((slug, index) => recipes.set(slug, {
    id: slug, slug, name: slug, image_url: 'https://images.unsplash.com/test.jpg', total_time_minutes: 20,
    base_servings: 1, is_public: true, meal_role: index === 0 ? 'protein_main' : 'veg_side', is_complete_meal: false,
    primary_protein: index === 0 ? ['pork','fish','chicken','beef','shrimp','tofu','chicken'][example.days.indexOf(day)] : 'vegetarian',
    method: example.days.indexOf(day) % 2 ? 'steamed' : 'stir_fry',
  }));
  return [...recipes.values()];
}

describe('Hong Kong daily homepage cache selection', () => {
  it('selects seven consecutive days and cycles independent of timestamp timezone representation', () => {
    expect(HOME_EXAMPLES).toHaveLength(HOME_EXAMPLE_COUNT);
    for (let day = 0; day < 14; day++) {
      const date = new Date(Date.parse('2026-11-09T00:00:00+08:00') + day * 86400000);
      expect(homeExampleIndex(date)).toBe(day % 7);
      expect(homeExampleIndex(new Date(date.toISOString()))).toBe(day % 7);
    }
    expect(hongKongDateKey(new Date('2026-11-08T15:59:59.999Z'))).toBe('2026-11-08');
    expect(homeExampleIndex(new Date('2026-11-08T15:59:59.999Z'))).toBe(6);
    expect(hongKongDateKey(new Date('2026-11-08T16:00:00Z'))).toBe('2026-11-09');
    expect(homeExampleIndex(new Date('2026-11-08T16:00:00Z'))).toBe(0);
  });
  it('rewrites each date to a separate shared ISR key and keeps the root URL public', () => {
    vi.useFakeTimers();
    for (let day = 0; day < 7; day++) {
      vi.setSystemTime(Date.parse('2026-11-09T00:00:00+08:00') + day * 86400000);
      const response = proxy(new NextRequest('https://eatwhathk.com/'));
      expect(response.headers.get('x-middleware-rewrite')).toBe(`https://eatwhathk.com/home-rotation/${day}`);
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect(proxy(new NextRequest('https://eatwhathk.com/home-rotation/0')).headers.get('location')).toBe('https://eatwhathk.com/');
    expect(proxy(new NextRequest('https://eatwhathk.com/home-rotation/0', { headers: { 'x-nextjs-data': '1' } })).headers.get('x-middleware-next')).toBe('1');
  });
  it('does not relax the admin guard', () => {
    vi.stubEnv('ADMIN_ENABLED', '');
    expect(proxy(new NextRequest('https://eatwhathk.com/admin/login')).status).toBe(404);
  });
});

describe('reviewed examples and card candidates', () => {
  it('has 49 genuinely different mains, seven pairs per group and a main hero', () => {
    const catalogue = exampleCatalogue();
    const mains = HOME_EXAMPLES.flatMap(group => group.days.map(day => day.slugs[0]));
    expect(new Set(mains).size).toBe(49);
    for (const group of HOME_EXAMPLES) {
      expect(validHomeExample(group, catalogue)).toBe(true);
      expect(group.days.some(day => day.slugs[0] === group.heroSlug)).toBe(true);
    }
  });
  it.each(['missing', 'private', 'photo', 'role', 'servings', 'complete'])('rejects an unusable %s group instead of displaying a partial example', failure => {
    const catalogue = exampleCatalogue(); const slug = HOME_EXAMPLES[0].days[0].slugs[0];
    const changed = catalogue.filter(r => failure !== 'missing' || r.slug !== slug).map(r => r.slug !== slug ? r : {
      ...r, is_public: failure !== 'private', image_url: failure === 'photo' ? null : r.image_url,
      meal_role: failure === 'role' ? 'protein_side' : r.meal_role,
      base_servings: failure === 'servings' ? 2 : 1, is_complete_meal: failure === 'complete',
    });
    expect(validHomeExample(HOME_EXAMPLES[0], changed)).toBe(false);
  });
  it('deduplicates and bounds a valid public-card pool without only taking the newest three', () => {
    const catalogue = exampleCatalogue();
    expect(featuredCandidates(catalogue)).toHaveLength(36);
    const one = catalogue[0];
    const pool = featuredCandidates([one, one, { ...one, slug: 'bad/slug' }, { ...one, slug: 'missing', image_url: null }, { ...one, slug: 'unsafe', image_url: 'http://127.0.0.1/private' }]);
    expect(pool.map(r => r.slug)).toEqual([one.slug]);
  });
});
