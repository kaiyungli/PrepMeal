/**
 * Unit tests for the shared, pure recipe-detail/list-detail normalization
 * module (`recipeDetailMapper.ts`). Run with: `npm test`.
 *
 * This file has zero relative/`@/` VALUE imports (only a type-only
 * `@/types/recipe` import, erased by `--experimental-strip-types`), so it
 * loads directly under this repo's `node --test` runner — see its own file
 * header for why. Imports the module under test with an explicit `.ts`
 * extension for the same reason `recipeDetailPrefetch.test.ts` does (Node's
 * ESM loader requires it for relative specifiers; `tsc`/Metro don't need it
 * and this repo doesn't enable `allowImportingTsExtensions`, so the
 * extension appears only in test-only import specifiers, never in
 * production source).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapRecipeDetail,
  mapIngredient,
  mapStep,
  mapListRow,
  mapRecipeListRows,
  warmRecipeDetailCache,
  warmRecipeDetailCacheIfCurrent,
  invalidateStaleRecipeDetailAliases,
  toNullableString,
  toNullableNumber,
  type RawRecipeDetail,
  type RawListRow,
} from './recipeDetailMapper.ts';
import { RecipeDetailCache } from '../services/recipeDetailCache.ts';
import {
  RecipeDetailPrefetchRegistry,
  resolveRecipeDetailSource,
} from '../services/recipeDetailPrefetchCore.ts';

// ---- toNullableString / toNullableNumber -----------------------------

test('toNullableString: empty/whitespace-only/non-string collapse to null', () => {
  assert.equal(toNullableString('hello'), 'hello');
  assert.equal(toNullableString(''), null);
  assert.equal(toNullableString('   '), null);
  assert.equal(toNullableString(null), null);
  assert.equal(toNullableString(undefined), null);
  assert.equal(toNullableString(42), null);
});

test('toNullableNumber: only finite numbers pass through', () => {
  assert.equal(toNullableNumber(12), 12);
  assert.equal(toNullableNumber(0), 0);
  assert.equal(toNullableNumber(NaN), null);
  assert.equal(toNullableNumber(Infinity), null);
  assert.equal(toNullableNumber('12'), null);
  assert.equal(toNullableNumber(null), null);
});

// ---- mapIngredient / mapStep -------------------------------------------

test('mapIngredient: full row maps every field, unit nested correctly', () => {
  const mapped = mapIngredient({
    id: 'ing-1',
    name: '洋蔥',
    slug: 'onion',
    shopping_category: 'vegetable',
    quantity: 2,
    unit: { code: 'pc', name: '個' },
  });
  assert.deepEqual(mapped, {
    id: 'ing-1',
    name: '洋蔥',
    slug: 'onion',
    shopping_category: 'vegetable',
    quantity: 2,
    unit: { code: 'pc', name: '個' },
  });
});

test('mapIngredient: null unit stays null, missing id/name fall back to empty string', () => {
  const mapped = mapIngredient({ quantity: null, unit: null });
  assert.equal(mapped.id, '');
  assert.equal(mapped.name, '');
  assert.equal(mapped.slug, null);
  assert.equal(mapped.quantity, null);
  assert.equal(mapped.unit, null);
});

test('mapStep: missing step_no/text/time_seconds degrade safely', () => {
  const mapped = mapStep({});
  assert.equal(mapped.step_no, 0);
  assert.equal(mapped.text, '');
  assert.equal(mapped.time_seconds, null);
});

test('mapStep: well-formed row passes through unchanged', () => {
  const mapped = mapStep({ step_no: 3, text: '拌勻', time_seconds: 60 });
  assert.deepEqual(mapped, { step_no: 3, text: '拌勻', time_seconds: 60 });
});

// ---- mapRecipeDetail -----------------------------------------------------

function rawDetail(overrides: Partial<RawRecipeDetail> = {}): RawRecipeDetail {
  return {
    id: 'r-1',
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

test('mapRecipeDetail: zero ingredients/zero steps map to [] not null', () => {
  const detail = mapRecipeDetail(rawDetail({ ingredients: null, steps: null }));
  assert.deepEqual(detail.ingredients, []);
  assert.deepEqual(detail.steps, []);
});

test('mapRecipeDetail: missing name falls back to the Cantonese placeholder', () => {
  const detail = mapRecipeDetail(rawDetail({ name: undefined as unknown as string }));
  assert.equal(detail.name, '未命名食譜');
});

test('mapRecipeDetail: preserves ingredient/step array order (never re-sorts)', () => {
  const detail = mapRecipeDetail(
    rawDetail({
      ingredients: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ],
      steps: [
        { step_no: 2, text: 'second' },
        { step_no: 1, text: 'first' },
      ],
    }),
  );
  assert.deepEqual(
    detail.ingredients.map((i) => i.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    detail.steps.map((s) => s.text),
    ['second', 'first'],
  );
});

test('mapRecipeDetail: null image_url/description/all-three-time-fields all degrade to null together', () => {
  const detail = mapRecipeDetail(
    rawDetail({
      image_url: null,
      description: null,
      total_time_minutes: null,
      cook_time_minutes: null,
      prep_time_minutes: null,
    }),
  );
  assert.equal(detail.image_url, null);
  assert.equal(detail.description, null);
  assert.equal(detail.total_time_minutes, null);
  assert.equal(detail.cook_time_minutes, null);
  assert.equal(detail.prep_time_minutes, null);
});

// ---- mapListRow / mapRecipeListRows --------------------------------------

function rawListRow(overrides: Partial<RawListRow> = {}): RawListRow {
  return { ...rawDetail(), slug: 'garlic-fried-rice', ...overrides };
}

test('mapListRow: reuses mapRecipeDetail verbatim and adds slug', () => {
  const row = rawListRow({ slug: 'garlic-fried-rice' });
  const viaList = mapListRow(row);
  const viaDetail = mapRecipeDetail(row);

  assert.equal(viaList.slug, 'garlic-fried-rice');
  // Every RecipeDetail field must agree exactly with the reused mapper —
  // this is the "one source of truth" property the whole design depends on.
  const { slug: _slug, ...detailFields } = viaList;
  assert.deepEqual(detailFields, viaDetail);
});

test('mapListRow: null/missing slug maps to null, not undefined or empty string', () => {
  assert.equal(mapListRow(rawListRow({ slug: null })).slug, null);
  assert.equal(mapListRow(rawListRow({ slug: undefined })).slug, null);
  assert.equal(mapListRow(rawListRow({ slug: '' })).slug, null);
});

test('mapRecipeListRows: RPC response must be an array — object/null/string all fail safely', () => {
  assert.throws(() => mapRecipeListRows({}), /did not return a JSON array/);
  assert.throws(() => mapRecipeListRows(null), /did not return a JSON array/);
  assert.throws(() => mapRecipeListRows('nope'), /did not return a JSON array/);
});

test('mapRecipeListRows: empty array maps successfully to []', () => {
  assert.deepEqual(mapRecipeListRows([]), []);
});

test('mapRecipeListRows: preserves summary + full detail fields for every row, in order', () => {
  const rows = [
    rawListRow({ id: 'r-1', slug: 'a', name: 'Recipe A' }),
    rawListRow({ id: 'r-2', slug: 'b', name: 'Recipe B' }),
  ];
  const mapped = mapRecipeListRows(rows);
  assert.equal(mapped.length, 2);
  assert.equal(mapped[0].id, 'r-1');
  assert.equal(mapped[0].slug, 'a');
  assert.equal(mapped[0].name, 'Recipe A');
  assert.equal(mapped[0].cook_time_minutes, 15);
  assert.equal(mapped[1].id, 'r-2');
  assert.equal(mapped[1].slug, 'b');
});

test('mapRecipeListRows: a malformed row (missing id) throws and identifies its index', () => {
  const rows = [rawListRow({ id: 'r-1' }), { name: 'no id here' }];
  assert.throws(() => mapRecipeListRows(rows), /index 1.*missing non-empty string id/s);
});

test('mapRecipeListRows: a malformed row (missing name) throws and identifies its index', () => {
  const rows = [rawListRow({ id: 'r-1' }), { id: 'r-2' }];
  assert.throws(() => mapRecipeListRows(rows), /index 1.*missing string name/s);
});

test('mapRecipeListRows: one bad row among many good ones produces NO partial array — the throw propagates before any return', () => {
  const rows = [
    rawListRow({ id: 'r-1' }),
    rawListRow({ id: 'r-2' }),
    { id: '', name: 'bad row: empty id' },
    rawListRow({ id: 'r-4' }),
  ];
  let threw = false;
  let result: unknown;
  try {
    result = mapRecipeListRows(rows);
  } catch {
    threw = true;
  }
  assert.equal(threw, true);
  assert.equal(result, undefined); // never assigned — mapRecipeListRows never returned
});

// ---- warmRecipeDetailCache -------------------------------------------

test('warmRecipeDetailCache: stores every row under BOTH its slug and its UUID id', () => {
  const cache = new RecipeDetailCache();
  const rows = [
    mapListRow(rawListRow({ id: 'uuid-1', slug: 'slug-1' })),
    mapListRow(rawListRow({ id: 'uuid-2', slug: 'slug-2' })),
  ];

  warmRecipeDetailCache(rows, cache);

  assert.equal(cache.has('slug-1'), true);
  assert.equal(cache.has('uuid-1'), true);
  assert.equal(cache.has('slug-2'), true);
  assert.equal(cache.has('uuid-2'), true);
});

test('warmRecipeDetailCache: falls back to id as the cache key when slug is null', () => {
  const cache = new RecipeDetailCache();
  const row = mapListRow(rawListRow({ id: 'uuid-only', slug: null }));

  warmRecipeDetailCache([row], cache);

  assert.equal(cache.has('uuid-only'), true);
});

test('warmRecipeDetailCache: list and cache hold the SAME object reference, not a copy', () => {
  const cache = new RecipeDetailCache();
  const row = mapListRow(rawListRow({ id: 'uuid-3', slug: 'slug-3' }));
  const rows = [row];

  warmRecipeDetailCache(rows, cache);

  assert.equal(cache.get('slug-3'), row); // reference equality, not deepEqual
  assert.equal(cache.get('uuid-3'), row);
  assert.equal(cache.get('slug-3'), cache.get('uuid-3'));
});

test('warmRecipeDetailCache: capacity safely holds 200 rows × 2 aliases (400 keys) with zero eviction', () => {
  const cache = new RecipeDetailCache(500); // matches RECIPE_DETAIL_CACHE_CAPACITY
  const rows = Array.from({ length: 200 }, (_, i) =>
    mapListRow(rawListRow({ id: `uuid-${i}`, slug: `slug-${i}` })),
  );

  warmRecipeDetailCache(rows, cache);

  assert.equal(cache.size, 400);
  // Spot-check the FIRST row warmed is still present — proves nothing was
  // evicted by the later 199 warm-up writes.
  assert.equal(cache.get('slug-0'), rows[0]);
  assert.equal(cache.get('uuid-199'), rows[199]);
});

// ---- two-stage load: invalidateStaleRecipeDetailAliases / --------------
// ---- warmRecipeDetailCacheIfCurrent -------------------------------------

function recipeSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uuid-1',
    slug: 'slug-1',
    name: 'Recipe A',
    image_url: null,
    cuisine: null,
    difficulty: null,
    total_time_minutes: null,
    primary_protein: null,
    ...overrides,
  };
}

test('invalidateStaleRecipeDetailAliases: a fresh summary load drops the OLD cached detail for every returned row, under both slug and id, before success is exposed', () => {
  const cache = new RecipeDetailCache();
  const staleDetail = mapListRow(
    rawListRow({ id: 'uuid-1', slug: 'slug-1', name: 'Old cached detail' }),
  );
  cache.set('slug-1', staleDetail); // seeds both the 'slug-1' and 'uuid-1' aliases

  assert.equal(cache.has('slug-1'), true);
  assert.equal(cache.has('uuid-1'), true);

  invalidateStaleRecipeDetailAliases([recipeSummary()], cache);

  assert.equal(cache.has('slug-1'), false);
  assert.equal(cache.has('uuid-1'), false);
});

test('invalidateStaleRecipeDetailAliases: a row with no prior cache entry is a no-op, never throws', () => {
  const cache = new RecipeDetailCache();
  assert.doesNotThrow(() => {
    invalidateStaleRecipeDetailAliases([recipeSummary({ id: 'never-cached', slug: null })], cache);
  });
});

test('early tap during background warm resolves fresh, not stale cache (Stage-1 invalidation + resolveRecipeDetailSource)', () => {
  const cache = new RecipeDetailCache();
  const registry = new RecipeDetailPrefetchRegistry(cache, async () => {
    throw new Error('not used in this test — resolveRecipeDetailSource never calls it directly');
  });

  const staleDetail = mapListRow(
    rawListRow({ id: 'uuid-7', slug: 'slug-7', name: 'Stale cached detail' }),
  );
  cache.set('slug-7', staleDetail);

  // Stage 1 of a fresh summary load invalidates this recipe's old alias
  // before the list is ever exposed as `success`...
  invalidateStaleRecipeDetailAliases([recipeSummary({ id: 'uuid-7', slug: 'slug-7' })], cache);

  // ...so a detail open ("tap") landing before Stage 2's background warm has
  // finished must NOT resolve from the now-invalidated cache — it falls
  // through to 'fresh' (a real fetch), never serving the stale detail that
  // was there before this load.
  const source = resolveRecipeDetailSource('slug-7', false, cache, registry);
  assert.equal(source.type, 'fresh');
});

test('warmRecipeDetailCacheIfCurrent: background completion warms every row under slug+id when still current', () => {
  const cache = new RecipeDetailCache();
  const rows = [mapListRow(rawListRow({ id: 'uuid-9', slug: 'slug-9' }))];

  const warmed = warmRecipeDetailCacheIfCurrent(rows, cache, () => true);

  assert.equal(warmed, true);
  assert.equal(cache.has('slug-9'), true);
  assert.equal(cache.has('uuid-9'), true);
});

test('warmRecipeDetailCacheIfCurrent: a stale/cancelled background result cannot overwrite a newer cache write', () => {
  const cache = new RecipeDetailCache();
  const fresh = mapListRow(rawListRow({ id: 'uuid-1', slug: 'slug-1', name: 'Fresh (newer run)' }));
  const stale = mapListRow(rawListRow({ id: 'uuid-1', slug: 'slug-1', name: 'Stale (older run)' }));

  // The newer background run finishes first and is still current.
  const warmedNewer = warmRecipeDetailCacheIfCurrent([fresh], cache, () => true);
  assert.equal(warmedNewer, true);

  // The older run resolves afterwards; by the time it checks, a newer run
  // has already superseded it, so `isCurrent` reports false and its (stale)
  // result must be discarded rather than overwriting the fresher entry.
  const warmedOlder = warmRecipeDetailCacheIfCurrent([stale], cache, () => false);
  assert.equal(warmedOlder, false);

  assert.equal(cache.get('slug-1')!.name, 'Fresh (newer run)');
});

test('background detail-warm failure is swallowed and leaves the cache exactly as it was (the visible summary list stays successful)', async () => {
  const cache = new RecipeDetailCache();
  const existing = mapListRow(rawListRow({ id: 'uuid-5', slug: 'slug-5' }));
  cache.set('slug-5', existing);

  const cancelled = false;
  const fetchListWithDetail = (): Promise<ReturnType<typeof mapListRow>[]> =>
    Promise.reject(new Error('RPC failed'));

  // Mirrors useRecipes.ts's Stage 2 effect body: a rejection is caught and
  // never re-thrown, never written to the cache, and — because this code
  // path never calls `setState` — never turns an already-successful,
  // already-rendered summary list into an error state.
  await assert.doesNotReject(
    fetchListWithDetail()
      .then((rows) => {
        warmRecipeDetailCacheIfCurrent(rows, cache, () => !cancelled);
      })
      .catch(() => {
        // dev-only console.warn in the real hook; swallowed here too.
      }),
  );

  assert.equal(cache.has('slug-5'), true); // untouched by the failed warm
  assert.equal(cache.get('slug-5'), existing);
});
