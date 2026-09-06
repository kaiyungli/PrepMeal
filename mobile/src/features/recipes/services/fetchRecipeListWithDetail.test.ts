/**
 * Integration-style tests for the list-with-detail contract:
 * "a list-originated detail open costs zero additional RPCs, a deep link
 * still falls back, and an already-warmed card's prefetch is a no-op."
 *
 * Deliberately does NOT import `fetchRecipeListWithDetail.ts` itself (it has
 * a real `@/lib/supabase` import, so — like `fetchRecipeDetail.ts` — it
 * can't load under this repo's `node --test` runner; see that file's own
 * header). Instead this exercises the exact pure pieces the real module
 * wires together: `mapRecipeListRows`/`warmRecipeDetailCache`
 * (`../lib/recipeDetailMapper.ts`), `RecipeDetailCache`
 * (`./recipeDetailCache.ts`), and `RecipeDetailPrefetchRegistry` /
 * `resolveRecipeDetailSource` (`./recipeDetailPrefetchCore.ts`) — all
 * zero-`@/`-value-import modules, loaded here with explicit `.ts`
 * extensions for the same Node-ESM reason `recipeDetailPrefetch.test.ts`
 * already documents.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapRecipeListRows,
  warmRecipeDetailCache,
  type RawListRow,
} from '../lib/recipeDetailMapper.ts';
import { RecipeDetailCache, RECIPE_DETAIL_CACHE_CAPACITY } from './recipeDetailCache.ts';
import {
  RecipeDetailPrefetchRegistry,
  resolveRecipeDetailSource,
} from './recipeDetailPrefetchCore.ts';

function rawListRow(overrides: Partial<RawListRow> = {}): RawListRow {
  return {
    id: 'uuid-1',
    slug: 'garlic-fried-rice',
    name: '蒜蓉炒飯',
    image_url: null,
    description: null,
    cuisine: 'cantonese',
    difficulty: 'easy',
    method: 'stir-fry',
    total_time_minutes: 20,
    cook_time_minutes: 15,
    prep_time_minutes: 5,
    primary_protein: 'egg',
    ingredients: [],
    steps: [],
    ...overrides,
  };
}

/** Build a warmed cache the way `useRecipes` does on a successful list load. */
function warmedCache(rows: RawListRow[]): { cache: RecipeDetailCache; mapped: ReturnType<typeof mapRecipeListRows> } {
  const cache = new RecipeDetailCache(RECIPE_DETAIL_CACHE_CAPACITY);
  const mapped = mapRecipeListRows(rows);
  warmRecipeDetailCache(mapped, cache);
  return { cache, mapped };
}

test('warmed list-originated open resolves to cache — no RPC path taken', () => {
  const { cache, mapped } = warmedCache([
    rawListRow({ id: 'uuid-1', slug: 'slug-1' }),
    rawListRow({ id: 'uuid-2', slug: 'slug-2' }),
  ]);
  const registry = new RecipeDetailPrefetchRegistry(cache, async () => {
    throw new Error('must not be called — this is the RPC path');
  });

  const source = resolveRecipeDetailSource('slug-1', false, cache, registry);
  assert.equal(source.type, 'cache');
  if (source.type === 'cache') {
    assert.equal(source.recipe, mapped[0]); // same reference, not a re-fetch
  }
});

test('warmed list-originated open by resolved UUID also resolves to cache', () => {
  const { cache, mapped } = warmedCache([rawListRow({ id: 'uuid-1', slug: 'slug-1' })]);
  const registry = new RecipeDetailPrefetchRegistry(cache, async () => {
    throw new Error('must not be called');
  });

  const source = resolveRecipeDetailSource('uuid-1', false, cache, registry);
  assert.equal(source.type, 'cache');
  if (source.type === 'cache') {
    assert.equal(source.recipe, mapped[0]);
  }
});

test('unknown/unwarmed id resolves fresh — the deep-link fallback path is untouched', () => {
  const { cache } = warmedCache([rawListRow({ id: 'uuid-1', slug: 'slug-1' })]);
  const registry = new RecipeDetailPrefetchRegistry(cache, async () => {
    throw new Error('not reached by this assertion — only resolution is checked');
  });

  const source = resolveRecipeDetailSource('never-warmed-slug', false, cache, registry);
  assert.equal(source.type, 'fresh');
});

test('warmed card prefetch no-ops: cache.has() guard prevents any RPC for an already-local recipe', async () => {
  const { cache } = warmedCache([rawListRow({ id: 'uuid-1', slug: 'slug-1' })]);
  let fetchCalls = 0;
  const registry = new RecipeDetailPrefetchRegistry(cache, async (idOrSlug) => {
    fetchCalls += 1;
    return mapRecipeListRows([rawListRow({ id: idOrSlug })])[0];
  });

  registry.prefetch('slug-1');

  assert.equal(fetchCalls, 0);
  assert.equal(registry.size, 0); // nothing was ever put in flight
});

test('prefetch for a NOT-yet-warmed recipe still starts normally (fallback path unaffected)', async () => {
  const { cache } = warmedCache([]); // nothing warmed
  let fetchCalls = 0;
  const registry = new RecipeDetailPrefetchRegistry(cache, async (idOrSlug) => {
    fetchCalls += 1;
    return mapRecipeListRows([rawListRow({ id: 'resolved-uuid', slug: idOrSlug })])[0];
  });

  registry.prefetch('deep-link-slug');
  assert.equal(registry.size, 1);

  const inFlight = registry.get('deep-link-slug');
  assert.ok(inFlight);
  await inFlight;
  assert.equal(fetchCalls, 1);
});

test('capacity (RECIPE_DETAIL_CACHE_CAPACITY) safely exceeds 400 alias keys — the 200-row list bound × 2', () => {
  assert.ok(
    RECIPE_DETAIL_CACHE_CAPACITY > 400,
    `expected capacity to exceed 400 (200-row list bound x 2 aliases), got ${RECIPE_DETAIL_CACHE_CAPACITY}`,
  );

  const rows = Array.from({ length: 200 }, (_, i) =>
    rawListRow({ id: `uuid-${i}`, slug: `slug-${i}` }),
  );
  const { cache } = warmedCache(rows);

  // All 400 aliases (200 recipes x 2 keys) survive — nothing evicted.
  assert.equal(cache.size, 400);
  for (let i = 0; i < 200; i += 1) {
    assert.equal(cache.has(`slug-${i}`), true);
    assert.equal(cache.has(`uuid-${i}`), true);
  }
});

test('mapRecipeListRows + warmRecipeDetailCache: a fully failed mapping never partially warms the cache', () => {
  const cache = new RecipeDetailCache();
  const rows: unknown[] = [
    rawListRow({ id: 'uuid-good-1', slug: 'good-1' }),
    { id: '', name: 'malformed: empty id' },
  ];

  assert.throws(() => {
    const mapped = mapRecipeListRows(rows);
    // unreachable if mapRecipeListRows behaves correctly — proves the throw
    // happens before warm-up would ever run in real `useRecipes` code.
    warmRecipeDetailCache(mapped, cache);
  });

  assert.equal(cache.size, 0);
  assert.equal(cache.has('good-1'), false);
});
