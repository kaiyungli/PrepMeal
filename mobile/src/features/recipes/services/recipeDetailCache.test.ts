/**
 * Unit tests for the bounded, session-only recipe-detail LRU cache.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { RecipeDetailCache } from './recipeDetailCache.ts';

function detail(id: string, name = id) {
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

test('get returns undefined for a miss, the stored value for a hit', () => {
  const cache = new RecipeDetailCache(5);
  assert.equal(cache.get('nope'), undefined);
  const d = detail('uuid-1');
  cache.set('cucumber-egg', d);
  assert.equal(cache.get('cucumber-egg'), d);
});

test('key lookup is case/whitespace-insensitive', () => {
  const cache = new RecipeDetailCache(5);
  const d = detail('uuid-1');
  cache.set('  Cucumber-Egg  ', d);
  assert.equal(cache.get('cucumber-egg'), d);
});

test('set aliases under the request key AND the resolved id', () => {
  const cache = new RecipeDetailCache(5);
  const d = detail('uuid-42');
  cache.set('some-slug', d);
  assert.equal(cache.get('some-slug'), d);
  assert.equal(cache.get('uuid-42'), d);
});

test('an empty / nullish request key is ignored, but the id alias is still stored', () => {
  const cache = new RecipeDetailCache(5);
  cache.set('', detail('x'));
  cache.set(null, detail('y'));
  assert.equal(cache.get(''), undefined);
  assert.equal(cache.get(null), undefined);
  assert.ok(cache.get('x'));
  assert.ok(cache.get('y'));
  assert.equal(cache.size, 2);
});

test('get with an empty / nullish key is always a miss', () => {
  const cache = new RecipeDetailCache(5);
  cache.set('real', detail('real'));
  assert.equal(cache.get(''), undefined);
  assert.equal(cache.get(undefined), undefined);
});

test('evicts the least-recently-used entry past capacity', () => {
  const cache = new RecipeDetailCache(3);
  // Each set writes 2 aliases (slug + id); use matching slug==id to keep it 1.
  cache.set('a', detail('a'));
  cache.set('b', detail('b'));
  cache.set('c', detail('c'));
  assert.equal(cache.size, 3);

  // Touch 'a' so 'b' is now the oldest.
  assert.ok(cache.get('a'));
  cache.set('d', detail('d'));

  assert.equal(cache.get('b'), undefined, 'b evicted');
  assert.ok(cache.get('a'), 'a kept (recently used)');
  assert.ok(cache.get('c'));
  assert.ok(cache.get('d'));
  assert.equal(cache.size, 3);
});

test('re-setting an existing key refreshes recency and does not grow size', () => {
  const cache = new RecipeDetailCache(2);
  cache.set('a', detail('a'));
  cache.set('b', detail('b'));
  cache.set('a', detail('a', 'a2')); // touch a
  cache.set('c', detail('c')); // should evict b, not a
  assert.ok(cache.get('a'));
  assert.equal(cache.get('b'), undefined);
  assert.ok(cache.get('c'));
});

test('invalidate drops the recipe under EVERY alias (request key + resolved id)', () => {
  const cache = new RecipeDetailCache(5);
  const d = detail('uuid-77');
  cache.set('braised-pork', d);
  assert.ok(cache.get('braised-pork'));
  assert.ok(cache.get('uuid-77'));

  const removed = cache.invalidate('braised-pork');
  assert.equal(removed, 2);
  assert.equal(cache.get('braised-pork'), undefined, 'slug alias gone');
  assert.equal(cache.get('uuid-77'), undefined, 'uuid alias gone');
  assert.equal(cache.size, 0);
});

test('invalidate works when called with the resolved id alias, not just the slug', () => {
  const cache = new RecipeDetailCache(5);
  cache.set('some-slug', detail('uuid-88'));
  cache.invalidate('uuid-88');
  assert.equal(cache.get('some-slug'), undefined);
  assert.equal(cache.get('uuid-88'), undefined);
});

test('invalidate removes only the targeted recipe, leaving its neighbours intact', () => {
  const cache = new RecipeDetailCache(5);
  cache.set('slug-a', detail('id-a'));
  cache.set('slug-b', detail('id-b'));

  cache.invalidate('slug-a');

  assert.equal(cache.get('slug-a'), undefined);
  assert.equal(cache.get('id-a'), undefined);
  assert.ok(cache.get('slug-b'), 'unrelated recipe still cached');
  assert.ok(cache.get('id-b'));
});

test('invalidate is a no-op (returns 0) for an unknown key', () => {
  const cache = new RecipeDetailCache(5);
  cache.set('known', detail('known'));
  assert.equal(cache.invalidate('unknown-slug'), 0);
  assert.ok(cache.get('known'), 'unrelated entry untouched');
});

test('an evicted alias is fully forgotten (no stale group / reverse-index leak)', () => {
  const cache = new RecipeDetailCache(2);
  cache.set('a', detail('a'));
  cache.set('b', detail('b'));
  cache.set('c', detail('c')); // evicts 'a'
  assert.equal(cache.get('a'), undefined);
  // Re-adding 'a' then invalidating it must not throw or over-count.
  cache.set('a', detail('a'));
  assert.equal(cache.invalidate('a'), 1);
  assert.equal(cache.get('a'), undefined);
});

test('capacity eviction drops a recipe\'s ENTIRE alias group atomically (A)', () => {
  const cache = new RecipeDetailCache(3);
  cache.set('slug-x', detail('uuid-x')); // 2 aliases -> size 2
  cache.set('solo-1', detail('solo-1')); // size 3 (full)
  assert.equal(cache.size, 3);

  cache.set('solo-2', detail('solo-2')); // size 4 -> evict oldest group (slug-x/uuid-x)

  assert.equal(cache.get('slug-x'), undefined, 'slug alias evicted');
  assert.equal(cache.get('uuid-x'), undefined, 'uuid alias evicted with it');
  assert.ok(cache.get('solo-1'));
  assert.ok(cache.get('solo-2'));
  assert.equal(cache.size, 2);
});

test('evicting recipe A leaves recipe B\'s aliases fully resolvable (B)', () => {
  const cache = new RecipeDetailCache(4);
  cache.set('a-slug', detail('a-id')); // size 2
  cache.set('b-slug', detail('b-id')); // size 4 (full)
  assert.equal(cache.size, 4);

  cache.set('c-slug', detail('c-id')); // size 6 -> evict A's group (2) -> size 4

  assert.equal(cache.get('a-slug'), undefined);
  assert.equal(cache.get('a-id'), undefined);
  assert.ok(cache.get('b-slug'), 'B slug still cached');
  assert.ok(cache.get('b-id'), 'B uuid still cached');
  assert.ok(cache.get('c-slug'));
  assert.ok(cache.get('c-id'));
  assert.equal(cache.size, 4);
});

test('no stale bookkeeping survives a group eviction (C)', () => {
  const cache = new RecipeDetailCache(2);
  cache.set('a-slug', detail('a-id')); // size 2 (full)
  cache.set('b-slug', detail('b-id')); // size 4 -> evict A's group -> size 2

  // A is fully gone: invalidating either former alias is a clean no-op.
  assert.equal(cache.invalidate('a-slug'), 0);
  assert.equal(cache.invalidate('a-id'), 0);

  // Re-using the same slug for a DIFFERENT recipe must not be polluted by the
  // evicted group, and must then invalidate cleanly under exactly its 2 aliases.
  cache.set('a-slug', detail('a-id-2')); // evicts B's group -> size 2
  assert.ok(cache.get('a-slug'));
  assert.ok(cache.get('a-id-2'));
  assert.equal(cache.invalidate('a-slug'), 2, 'exactly the 2 fresh aliases, nothing stale');
  assert.equal(cache.size, 0);
});

test('delete removes request key and id alias; clear empties everything', () => {
  const cache = new RecipeDetailCache(5);
  const d = detail('uuid-9');
  cache.set('slug-9', d);
  cache.delete('slug-9', d);
  assert.equal(cache.get('slug-9'), undefined);
  assert.equal(cache.get('uuid-9'), undefined);

  cache.set('x', detail('x'));
  cache.set('y', detail('y'));
  cache.clear();
  assert.equal(cache.size, 0);
});
