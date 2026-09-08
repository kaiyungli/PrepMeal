/**
 * Unit tests for the pure Generate candidate-pool cache
 * (`generateRecipesCache.ts`). Run with: `npm test`.
 *
 * Imports the CORE (zero value imports), never `fetchGenerateRecipes.ts` —
 * that wires in the real `@/lib/supabase` client and would not load under
 * `node --test`. Each test builds an isolated cache with a fake `load` and,
 * where timing matters, a fake clock.
 *
 * Focus: the abort-race the review flagged — a retry must never join a request
 * a previous effect aborted, and an obsolete caller must not corrupt the slot.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGenerateRecipesCache,
  GENERATE_RECIPE_CACHE_TTL_MS,
} from './generateRecipesCache.ts';
import type { GenerateRecipe } from '../types.ts';

function recipe(id: string): GenerateRecipe {
  return {
    id,
    slug: null,
    name: id,
    image_url: null,
    description: null,
    cuisine: null,
    dish_type: null,
    method: null,
    speed: null,
    primary_protein: null,
    protein: [],
    diet: [],
    flavor: null,
    is_complete_meal: false,
    meal_role: null,
    total_time_minutes: null,
    difficulty: null,
  } satisfies GenerateRecipe;
}

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

test('concurrent callers share exactly one load() promise (single-flight)', async () => {
  let calls = 0;
  const d = deferred<GenerateRecipe[]>();
  const cache = createGenerateRecipesCache({
    load: () => {
      calls += 1;
      return d.promise;
    },
  });

  const a = cache.fetch();
  const b = cache.fetch();
  const c = cache.fetch({ force: true });

  assert.equal(a, b);
  assert.equal(b, c, 'force still joins the in-flight request, never a 2nd');
  assert.equal(calls, 1);

  d.resolve([recipe('a')]);
  await Promise.all([a, b, c]);
  assert.equal(calls, 1);
});

test('load() takes no abort signal — the shared request cannot be argument-cancelled', async () => {
  let receivedArgs = -1;
  const cache = createGenerateRecipesCache({
    load: (...args: unknown[]) => {
      receivedArgs = args.length;
      return Promise.resolve([recipe('a')]);
    },
  });

  await cache.fetch();
  assert.equal(receivedArgs, 0);
});

test('a retry after the shared request settled reuses the warmed slot', async () => {
  let calls = 0;
  const cache = createGenerateRecipesCache({
    load: () => {
      calls += 1;
      return Promise.resolve([recipe(`r${calls}`)]);
    },
  });

  const first = await cache.fetch();
  assert.equal(calls, 1);

  // Simulates useGenerateRecipes: the first effect "cancelled" (its result was
  // ignored by the hook's guard) but never aborted the fetch. The retry effect
  // runs with force=false and must get the warmed slot with no new request.
  const retry = await cache.fetch();
  assert.equal(calls, 1, 'no second load() — retry reused the completed slot');
  assert.equal(retry, first);
});

test('a retry mid-flight joins the LIVE request, not a dead one', async () => {
  let calls = 0;
  const d = deferred<GenerateRecipe[]>();
  const cache = createGenerateRecipesCache({
    load: () => {
      calls += 1;
      return calls === 1 ? d.promise : Promise.resolve([recipe('second')]);
    },
  });

  const firstEffect = cache.fetch(); // effect A starts the shared request
  // effect A cleans up here — in the old code it aborted the shared request;
  // now cleanup does nothing to the fetch.
  const retryEffect = cache.fetch({ force: true }); // effect B (retry)

  assert.equal(retryEffect, firstEffect, 'retry joined the still-live request');
  assert.equal(calls, 1);

  d.resolve([recipe('first')]);
  const [, retryResult] = await Promise.all([firstEffect, retryEffect]);
  assert.deepEqual(
    retryResult.map((r) => r.id),
    ['first'],
    'retry resolved from the shared request that was allowed to finish',
  );
});

test('force after the slot is warm starts a fresh request', async () => {
  let calls = 0;
  const cache = createGenerateRecipesCache({
    load: () => {
      calls += 1;
      return Promise.resolve([recipe(`r${calls}`)]);
    },
  });

  await cache.fetch();
  assert.equal(calls, 1);

  const forced = await cache.fetch({ force: true });
  assert.equal(calls, 2);
  assert.deepEqual(forced.map((r) => r.id), ['r2']);
});

test('a rejected shared request rejects every joiner and leaves the slot intact', async () => {
  let mode: 'ok' | 'fail' = 'ok';
  const cache = createGenerateRecipesCache({
    load: () =>
      mode === 'ok'
        ? Promise.resolve([recipe('a')])
        : Promise.reject(new Error('query failed')),
  });

  const good = await cache.fetch();
  assert.equal(cache.peek(), good);

  mode = 'fail';
  const p1 = cache.fetch({ force: true });
  const p2 = cache.fetch({ force: true });
  assert.equal(p1, p2, 'both joiners see the same failing promise');
  await assert.rejects(p1, /query failed/);
  await assert.rejects(p2, /query failed/);
  assert.equal(cache.peek(), good, 'slot unchanged after a failed refresh');

  // The failed handle is released — a follow-up retry can start a new request.
  mode = 'ok';
  const recovered = await cache.fetch({ force: true });
  assert.deepEqual(recovered.map((r) => r.id), ['a']);
});

test('the slot serves within the TTL and refreshes once it elapses', async () => {
  let calls = 0;
  const clock = fakeClock();
  const cache = createGenerateRecipesCache({
    now: clock.now,
    load: () => {
      calls += 1;
      return Promise.resolve([recipe(`r${calls}`)]);
    },
  });

  await cache.fetch();
  assert.equal(calls, 1);

  clock.advance(GENERATE_RECIPE_CACHE_TTL_MS - 1);
  await cache.fetch();
  assert.equal(calls, 1, 'still fresh — served from the slot');

  clock.advance(2);
  await cache.fetch();
  assert.equal(calls, 2, 'TTL elapsed — one refresh');
});

test('clear() drops the slot and the in-flight handle', async () => {
  const d = deferred<GenerateRecipe[]>();
  let calls = 0;
  const cache = createGenerateRecipesCache({
    load: () => {
      calls += 1;
      return calls === 1 ? d.promise : Promise.resolve([recipe('fresh')]);
    },
  });

  const p = cache.fetch();
  cache.clear();

  // A fetch after clear() does not join the abandoned request.
  const afterClear = cache.fetch();
  assert.notEqual(afterClear, p);
  assert.equal(calls, 2);

  d.resolve([recipe('stale')]);
  await Promise.all([p, afterClear]);
  assert.deepEqual(cache.peek()?.map((r) => r.id), ['fresh']);
});
