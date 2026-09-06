/**
 * Unit tests for the recipe-detail prefetch registry and its join-decision
 * logic (`resolveRecipeDetailSource`, the exact function `useRecipeDetail.ts`
 * calls). Run with: `npm test` (node's built-in test runner, TS types stripped).
 *
 * Imports `RecipeDetailPrefetchRegistry` / `resolveRecipeDetailSource` from
 * `recipeDetailPrefetchCore.ts`, NOT `recipeDetailPrefetch.ts` — the latter
 * wires in the real `recipeDetailCache` singleton and a lazy real-network
 * `fetchRecipeDetail`, and this repo's `node --test` runner has no `@/`
 * path-alias resolution (only `tsconfig.json`'s `paths`, which Metro/`tsc`
 * honor, not plain Node). The core module takes zero relative imports for
 * exactly this reason (see its file header), so it loads safely here.
 *
 * Exercised against isolated `RecipeDetailCache` / `RecipeDetailPrefetchRegistry`
 * instances — never the real singletons — plus a fake fetch function, so no
 * network call is ever made and no test can affect another.
 *
 * Deliberately does NOT import `fetchRecipeDetail.ts`, `RecipeNotFoundError`,
 * or anything from `../hooks/useRecipeDetail.ts`: both have a real (non-type)
 * `@/...` import (`@/lib/supabase`, `@/lib/env`) — importing either here
 * would make this whole file fail to load under `node --test`.
 * `RecipeNotFoundError`-shaped rejections are exercised below with a local
 * stand-in class; the registry only cares that SOME error was thrown and
 * passes it through unchanged, so this stand-in is exactly as good a test of
 * "the promise is a genuine, unswallowed rejection" as the real class would
 * be. `useRecipeDetail.ts`'s own consumption of that rejection
 * (`applyRecipeDetailError`, unchanged from before this slice) is verified by
 * code review, not an automated test, for the same reason.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { RecipeDetailCache } from './recipeDetailCache.ts';
import {
  RecipeDetailPrefetchRegistry,
  resolveRecipeDetailSource,
  MAX_CONCURRENT_PREFETCHES,
} from './recipeDetailPrefetchCore.ts';

/** Stand-in for the real `RecipeNotFoundError` (see the file header note). */
class FakeRecipeNotFoundError extends Error {
  constructor(idOrSlug: string) {
    super(`Recipe not found: ${idOrSlug}`);
    this.name = 'RecipeNotFoundError';
  }
}

function makeDetail(id: string, name = id) {
  return {
    id,
    name,
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

/** A promise plus external resolve/reject, for controlling settle timing in tests. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Detail = ReturnType<typeof makeDetail>;

/** A fetchRecipeDetail stand-in that records every call and is driven manually. */
function fakeFetcher() {
  const calls: string[] = [];
  const pending = new Map<string, ReturnType<typeof deferred<Detail>>>();
  const fn = (idOrSlug: string) => {
    calls.push(idOrSlug);
    const d = deferred<Detail>();
    pending.set(`${idOrSlug}#${calls.filter((c) => c === idOrSlug).length}`, d);
    return d.promise;
  };
  return {
    fn,
    calls,
    // Resolve/reject the Nth (1-indexed) call made for this idOrSlug.
    settle(idOrSlug: string, n: number, outcome: { resolve: unknown } | { reject: unknown }) {
      const d = pending.get(`${idOrSlug}#${n}`);
      if (!d) throw new Error(`no pending call #${n} for ${idOrSlug}`);
      if ('resolve' in outcome) d.resolve(outcome.resolve as ReturnType<typeof makeDetail>);
      else d.reject(outcome.reject);
    },
  };
}

// ---------------------------------------------------------------------------
// A–I: registry behavior
// ---------------------------------------------------------------------------

test('A: one prefetch call starts exactly one underlying fetch', () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('cucumber-scrambled-egg');

  assert.deepEqual(fetcher.calls, ['cucumber-scrambled-egg']);
  assert.equal(registry.size, 1);
});

test('B: a duplicate same-key prefetch reuses the in-flight request, no second fetch', () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  const first = registry.get('recipe-a');
  registry.prefetch('recipe-a');
  const second = registry.get('recipe-a');

  assert.equal(fetcher.calls.length, 1);
  assert.equal(first, second, 'the exact same Promise object must be reused');
});

test('C: a completed cache hit starts no request', () => {
  const cache = new RecipeDetailCache(10);
  cache.set('recipe-a', makeDetail('recipe-a'));
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');

  assert.deepEqual(fetcher.calls, []);
  assert.equal(registry.size, 0);
});

test('D: concurrency never exceeds MAX_CONCURRENT_PREFETCHES', () => {
  assert.equal(MAX_CONCURRENT_PREFETCHES, 2);
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('a');
  registry.prefetch('b');
  registry.prefetch('c'); // should be a no-op — bound reached

  assert.deepEqual(fetcher.calls, ['a', 'b']);
  assert.equal(registry.size, 2);
  assert.equal(registry.get('c'), undefined, 'the third id never started a request');
});

test('E: a successful fetch writes the detail cache', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  fetcher.settle('recipe-a', 1, { resolve: makeDetail('recipe-a') });
  await registry.get('recipe-a');

  assert.ok(cache.get('recipe-a'), 'cache now holds the resolved detail');
});

test('F: a rejected fetch does NOT write the detail cache', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  const pending = registry.get('recipe-a')!;
  fetcher.settle('recipe-a', 1, { reject: new Error('boom') });
  await assert.rejects(pending);

  assert.equal(cache.get('recipe-a'), undefined);
});

test('G: the in-flight entry is removed after a success settles', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  fetcher.settle('recipe-a', 1, { resolve: makeDetail('recipe-a') });
  await registry.get('recipe-a');

  assert.equal(registry.get('recipe-a'), undefined);
  assert.equal(registry.size, 0);
});

test('H: the in-flight entry is removed after a rejection settles', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  const pending = registry.get('recipe-a')!;
  fetcher.settle('recipe-a', 1, { reject: new Error('boom') });
  await assert.rejects(pending);

  assert.equal(registry.get('recipe-a'), undefined);
  assert.equal(registry.size, 0);
});

test('I: after a rejection, a later prefetch for the same id starts a fresh request', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  const firstPending = registry.get('recipe-a')!;
  fetcher.settle('recipe-a', 1, { reject: new Error('boom') });
  await assert.rejects(firstPending);

  registry.prefetch('recipe-a'); // retry
  fetcher.settle('recipe-a', 2, { resolve: makeDetail('recipe-a') });
  await registry.get('recipe-a');

  assert.equal(fetcher.calls.length, 2, 'a second, independent fetch was made');
  assert.ok(cache.get('recipe-a'), 'the retry succeeded and populated the cache');
});

// ---------------------------------------------------------------------------
// J–N: the resolveRecipeDetailSource join contract (what useRecipeDetail relies on)
// ---------------------------------------------------------------------------

test('J: joining an in-flight prefetch never starts a second RPC', () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a'); // e.g. RecipeCard's onPressIn
  const source = resolveRecipeDetailSource('recipe-a', false, cache, registry); // e.g. route mount

  assert.equal(source.type, 'join');
  assert.equal(fetcher.calls.length, 1, 'still only the ONE fetch the prefetch started');
  if (source.type === 'join') {
    assert.equal(source.promise, registry.get('recipe-a'), 'the exact same shared Promise');
  }
});

test('K: a joined promise preserves a RecipeNotFoundError-shaped rejection exactly (not swallowed, not converted to null)', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  const source = resolveRecipeDetailSource('recipe-a', false, cache, registry);
  assert.equal(source.type, 'join');

  const notFound = new FakeRecipeNotFoundError('recipe-a');
  fetcher.settle('recipe-a', 1, { reject: notFound });

  let caught: unknown;
  if (source.type === 'join') {
    await source.promise.then(
      () => assert.fail('expected the joined promise to reject'),
      (err) => {
        caught = err;
      },
    );
  }

  assert.equal(caught, notFound, 'the exact original error instance is observed, untouched');
  assert.ok(caught instanceof FakeRecipeNotFoundError);
  // `useRecipeDetail.ts`'s own `applyRecipeDetailError` (unchanged from before
  // this slice) is what turns this rejection into NOT_FOUND_STATE + a cache
  // invalidate — see the file header note on why that isn't unit-testable
  // here, and the alias/invalidation behavior itself is already covered by
  // `recipeDetailCache.test.ts`.
});

test('L: explicit refetch (bypassCache) ignores a completed cache hit', () => {
  const cache = new RecipeDetailCache(10);
  cache.set('recipe-a', makeDetail('recipe-a'));
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  const source = resolveRecipeDetailSource('recipe-a', /* bypassCache */ true, cache, registry);

  assert.equal(source.type, 'fresh', 'bypassCache must win over a completed cache hit');
});

test('L2: explicit refetch (bypassCache) ignores an in-flight prefetch for the same id', () => {
  // A real in-flight entry for the SAME id an explicit refetch targets can
  // only exist if the recipe was NOT already cached (prefetch() no-ops on a
  // cache hit) — the realistic case is: first-ever open is still loading
  // (via a prefetch or the mount-time fetch) and the user hits "retry" before
  // it settles. bypassCache must still win and start an independent request,
  // never silently reusing whatever the stale in-flight attempt resolves to.
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  assert.ok(registry.get('recipe-a'), 'precondition: a request is genuinely in flight');

  const source = resolveRecipeDetailSource('recipe-a', /* bypassCache */ true, cache, registry);

  assert.equal(source.type, 'fresh', 'bypassCache must win over an in-flight prefetch too');
});

test('M: an unmounted joining consumer does not apply stale state', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  const source = resolveRecipeDetailSource('recipe-a', false, cache, registry);
  assert.equal(source.type, 'join');

  const setStateCalls: unknown[] = [];
  let cancelled = false;
  if (source.type === 'join') {
    source.promise
      .then((recipe) => {
        if (cancelled) return;
        setStateCalls.push({ status: 'success', recipe });
      })
      .catch(() => {});
  }

  cancelled = true; // simulate the screen unmounting before the promise settles
  fetcher.settle('recipe-a', 1, { resolve: makeDetail('recipe-a') });
  await registry.get('recipe-a')?.catch(() => {});
  await Promise.resolve(); // flush the joined .then microtask

  assert.deepEqual(setStateCalls, [], 'no state was applied after "unmount"');
  assert.ok(cache.get('recipe-a'), 'the shared prefetch still completed and cached normally');
});

test('N: a second open after a successful first open remains zero-RPC', async () => {
  const cache = new RecipeDetailCache(10);
  const fetcher = fakeFetcher();
  const registry = new RecipeDetailPrefetchRegistry(cache, fetcher.fn);

  registry.prefetch('recipe-a');
  fetcher.settle('recipe-a', 1, { resolve: makeDetail('recipe-a') });
  await registry.get('recipe-a');

  const secondOpen = resolveRecipeDetailSource('recipe-a', false, cache, registry);

  assert.equal(secondOpen.type, 'cache');
  assert.equal(fetcher.calls.length, 1, 'no new fetch was started for the second open');
});
