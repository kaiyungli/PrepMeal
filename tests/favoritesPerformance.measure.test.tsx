import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useMemo } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// Controlled React/jsdom CPU benchmark. No live network or production data.
it('measures unchanged renders and request counts at representative list sizes', async () => {
  for (const size of [24, 188, 1000]) {
    const recipes = Array.from({ length: size }, (_, i) => ({
      id: String(i), name: `Synthetic recipe ${i}`, created_at: '2026-01-01',
      total_time_minutes: 10 + i % 40, diet: ['vegetarian'], flavor: ['spicy'],
    }));
    const requests: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      requests.push(url);
      return { ok: true, json: async () => ({ success: true, data: { favorites: recipes.map(r => r.id), recipes } }) };
    }));
    let filterRuns = 0;
    const hook = renderHook(() => {
      const favorites = useFavorites('synthetic-performance-token', `performance-${size}`, { includeRecipes: true });
      const { filterRecipes } = useRecipeFilters();
      const filtered = useMemo(() => { filterRuns++; return filterRecipes(favorites.recipes); }, [favorites.recipes, filterRecipes]);
      return { favorites, filtered };
    });
    await act(async () => {});
    expect(hook.result.current.filtered).toHaveLength(size);
    for (let i = 0; i < 10; i++) hook.rerender();
    const startRuns = filterRuns;
    const samples: number[] = [];
    let sameReferences = 0;
    for (let i = 0; i < 100; i++) {
      const previous = hook.result.current.favorites.recipes;
      const start = performance.now(); hook.rerender(); samples.push(performance.now() - start);
      if (hook.result.current.favorites.recipes === previous) sameReferences++;
    }
    const sorted = [...samples].sort((a, b) => a - b);
    console.log('FAVORITES_MEASURE', JSON.stringify({ size, samples: samples.length,
      filterRuns: filterRuns - startRuns, sameReferences, requests: requests.length,
      medianMs: sorted[49], p95Ms: sorted[94] }));
    expect(requests).toEqual(['/api/user/favorites?include=recipes']);
    hook.unmount();
  }
});
