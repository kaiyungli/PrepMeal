/**
 * Unit tests for the pure session-memory summary cache
 * (`recipeSummaryCacheCore.ts`). Run with: `npm test` (node's built-in runner,
 * TS types stripped).
 *
 * Imports the CORE (zero value imports), never `recipeSummaryCache.ts` — that
 * wires in the real `fetchRecipes` / `recipeDetailCache` singletons and would
 * not load under `node --test` (no `@/` alias resolution). Each test builds an
 * isolated cache with a fake `fetchSummaries` and, where timing matters, a fake
 * clock — so no network call is made and no test can affect another.
 *
 * The generation fence for Stage-2 full-detail warming is exercised through the
 * real `warmRecipeDetailCacheIfCurrent` + `RecipeDetailCache` (both already
 * `node --test`-loadable) against a predicate shaped exactly like the one
 * `useRecipes` passes: `() => !cancelled && cache.getGeneration() === captured`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRecipeSummaryCache,
  RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS,
} from './recipeSummaryCacheCore.ts';
import { RecipeDetailCache } from './recipeDetailCache.ts';
import { warmRecipeDetailCacheIfCurrent } from '../lib/recipeDetailMapper.ts';

// --- helpers ---------------------------------------------------------------

function summary(id: string, slug: string | null = id) {
  return {
    id,
    slug,
    name: id,
    image_url: null,
    cuisine: null,
    difficulty: null,
    total_time_minutes: null,
    primary_protein: null,
  };
}

function listRow(slug: string, id: string) {
  return {
    id,
    slug,
    name: id,
    image_url: null,
    description: null,
    cuisine: null,
    difficulty: null,
    method: null,
    total_time_minutes: null,
    cook_time_minutes: null,
    prep_time_minutes: null,
    primary_protein: null,
    ingredients: [],
    steps: [],
  };
}

/** A promise plus external resolve/reject, for controlling settle timing. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

// --- 1. shared single flight --------------------------------------------------

test('tab preload + an early Recipe-tab miss share exactly one fetch promise', async () => {
  let calls = 0;
  const d = deferred<ReturnType<typeof summary>[]>();
  const cache = createRecipeSummaryCache({
    fetchSummaries: () => {
      calls += 1;
      return d.promise;
    },
  });

  const fromTabsLayout = cache.preload(); // app/(tabs)/_layout.tsx
  const fromEarlyMiss = cache.preload(); // useRecipes cold-cache branch

  assert.equal(fromTabsLayout, fromEarlyMiss, 'must be the identical promise');
  assert.equal(calls, 1, 'exactly one fetchSummaries() call');

  d.resolve([summary('a')]);
  const [r1, r2] = await Promise.all([fromTabsLayout, fromEarlyMiss]);
  assert.equal(r1, r2);
  assert.equal(calls, 1);
  assert.equal(cache.getGeneration(), 1);
});

test('an explicit force does NOT start a second request while one is in flight', async () => {
  let calls = 0;
  const d = deferred<ReturnType<typeof summary>[]>();
  const cache = createRecipeSummaryCache({
    fetchSummaries: () => {
      calls += 1;
      return d.promise;
    },
  });

  const background = cache.preload();
  const refetch = cache.preload({ force: true });

  assert.equal(background, refetch);
  assert.equal(calls, 1);

  d.resolve([summary('a')]);
  await Promise.all([background, refetch]);
  assert.equal(calls, 1);
});

// --- 2. generation increments on accept ------------------------------------

test('each accepted fresh summary result increments the generation by one', async () => {
  const clock = fakeClock();
  const cache = createRecipeSummaryCache({
    now: clock.now,
    fetchSummaries: async () => [summary('a')],
  });

  assert.equal(cache.getGeneration(), 0);

  await cache.preload();
  assert.equal(cache.getGeneration(), 1);

  clock.advance(RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS + 1);
  await cache.preload(); // interval elapsed → real request → accept
  assert.equal(cache.getGeneration(), 2);

  await cache.preload({ force: true }); // forced real request → accept
  assert.equal(cache.getGeneration(), 3);
});

test('a failed request does NOT increment the generation', async () => {
  let mode: 'ok' | 'fail' = 'ok';
  const clock = fakeClock();
  const cache = createRecipeSummaryCache({
    now: clock.now,
    fetchSummaries: () =>
      mode === 'ok'
        ? Promise.resolve([summary('a')])
        : Promise.reject(new Error('network down')),
  });

  await cache.preload();
  assert.equal(cache.getGeneration(), 1);

  mode = 'fail';
  await assert.rejects(cache.preload({ force: true }), /network down/);
  assert.equal(cache.getGeneration(), 1);
});

// --- 3 & 4. generation fence for Stage-2 full-detail warming --------------

test('a full-detail warm from an OLDER summary generation is rejected (no write)', async () => {
  const clock = fakeClock();
  const cache = createRecipeSummaryCache({
    now: clock.now,
    fetchSummaries: async () => [summary('a', 'slug-a')],
  });

  await cache.preload();
  const capturedGeneration = cache.getGeneration(); // 1 — this warm "belongs" here
  const cancelled = false;

  // A newer summary is accepted before the warm's rows come back.
  await cache.preload({ force: true });
  assert.equal(cache.getGeneration(), 2);

  const writer = new RecipeDetailCache(10);
  const wrote = warmRecipeDetailCacheIfCurrent(
    [listRow('slug-a', 'id-a')],
    writer,
    () => !cancelled && cache.getGeneration() === capturedGeneration,
  );

  assert.equal(wrote, false);
  assert.equal(writer.size, 0);
});

test('a full-detail warm from the CURRENT summary generation writes', async () => {
  const cache = createRecipeSummaryCache({
    fetchSummaries: async () => [summary('a', 'slug-a')],
  });

  await cache.preload();
  const capturedGeneration = cache.getGeneration();
  const cancelled = false;

  const writer = new RecipeDetailCache(10);
  const wrote = warmRecipeDetailCacheIfCurrent(
    [listRow('slug-a', 'id-a')],
    writer,
    () => !cancelled && cache.getGeneration() === capturedGeneration,
  );

  assert.equal(wrote, true);
  assert.ok(writer.get('slug-a'));
  assert.ok(writer.get('id-a'));
});

// --- 5. synchronous cached read -----------------------------------------------

test('get() exposes the accepted list synchronously, with no await', async () => {
  const recipes = [summary('id-1', 'slug-1')];
  const cache = createRecipeSummaryCache({ fetchSummaries: async () => recipes });

  assert.equal(cache.get(), undefined);
  assert.equal(cache.has(), false);

  await cache.preload();

  const entry = cache.get(); // <- synchronous
  assert.ok(entry);
  assert.equal(entry.recipes, recipes, 'same reference, not a copy');
  assert.equal(cache.has(), true);
  assert.equal(typeof entry.storedAt, 'number');
});

// --- 6. background refresh failure preserves the cached list --------------

test('a failed background refresh leaves the cached list intact', async () => {
  const good = [summary('a')];
  let mode: 'ok' | 'fail' = 'ok';
  const clock = fakeClock();
  const cache = createRecipeSummaryCache({
    now: clock.now,
    fetchSummaries: () =>
      mode === 'ok'
        ? Promise.resolve(good)
        : Promise.reject(new Error('refresh failed')),
  });

  await cache.preload();
  assert.equal(cache.get()?.recipes, good);
  assert.equal(cache.getGeneration(), 1);

  mode = 'fail';
  clock.advance(RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS + 1);
  await assert.rejects(cache.preload({ force: true }), /refresh failed/);

  assert.equal(cache.get()?.recipes, good, 'cached list unchanged');
  assert.equal(cache.getGeneration(), 1, 'generation unchanged');
});

// --- 7. rate limit prevents an unnecessary refresh request ---------------

test('within the refresh interval a non-forced preload serves the slot with no network call', async () => {
  let calls = 0;
  const recipes = [summary('a')];
  const clock = fakeClock();
  const cache = createRecipeSummaryCache({
    now: clock.now,
    refreshMinIntervalMs: RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS,
    fetchSummaries: () => {
      calls += 1;
      return Promise.resolve(recipes);
    },
  });

  await cache.preload();
  assert.equal(calls, 1);

  clock.advance(RECIPE_SUMMARY_REFRESH_MIN_INTERVAL_MS - 1);
  const served = await cache.preload(); // no force, still inside the window
  assert.equal(calls, 1, 'no second request');
  assert.equal(served, recipes);

  clock.advance(2); // now past the window
  await cache.preload();
  assert.equal(calls, 2, 'refresh allowed once the interval has elapsed');
});

test('force performs a real request even inside the refresh interval', async () => {
  let calls = 0;
  const clock = fakeClock();
  const cache = createRecipeSummaryCache({
    now: clock.now,
    fetchSummaries: () => {
      calls += 1;
      return Promise.resolve([summary('a')]);
    },
  });

  await cache.preload();
  assert.equal(calls, 1);

  clock.advance(5_000); // well within the interval
  await cache.preload({ force: true });
  assert.equal(calls, 2);
  assert.equal(cache.getGeneration(), 2);
});

// --- request recency: a superseded response never writes -----------------

test('a request still in flight when clear() runs never writes the slot', async () => {
  const d = deferred<ReturnType<typeof summary>[]>();
  const cache = createRecipeSummaryCache({ fetchSummaries: () => d.promise });

  const p = cache.preload();
  cache.clear();
  d.resolve([summary('a')]);
  await p;

  assert.equal(cache.get(), undefined, 'clear() won; the stale accept was dropped');
  assert.equal(cache.getGeneration(), 0);
});
