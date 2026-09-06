/**
 * Unit tests for recipe image URL derivation + the fallback state machine.
 * Run with: `npm test` (node's built-in test runner, TS types stripped).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveRecipeVariantUrls,
  recipeVariantUrl,
  initialRecipeImagePhase,
  nextRecipeImagePhase,
  recipeImageUriForPhase,
  recipeThumbSources,
  recipeHeroSources,
} from './recipeImageUrl.ts';

const ORIGIN = 'https://hivnajhqqvaokthzhugx.supabase.co';
const PUBLIC = `${ORIGIN}/storage/v1/object/public/recipes`;

test('derives thumb + detail URLs from a normal recipes-bucket URL', () => {
  const urls = deriveRecipeVariantUrls(`${PUBLIC}/corn-minced-pork.png`);
  assert.equal(urls.thumb, `${PUBLIC}/variants/thumb/corn-minced-pork.webp`);
  assert.equal(urls.detail, `${PUBLIC}/variants/detail/corn-minced-pork.webp`);
});

test('handles a nested object path and strips query/hash', () => {
  assert.equal(
    recipeVariantUrl(`${PUBLIC}/sub/dir/dish.jpeg?token=abc#x`, 'thumb'),
    `${PUBLIC}/variants/thumb/sub/dir/dish.webp`,
  );
});

test('null / empty / non-string image_url yields null variants', () => {
  for (const value of [null, undefined, '', '   ']) {
    const urls = deriveRecipeVariantUrls(value as unknown as string | null);
    assert.equal(urls.thumb, null);
    assert.equal(urls.detail, null);
  }
});

test('non-Supabase / unsupported URLs are not rewritten', () => {
  for (const value of [
    'https://images.unsplash.com/photo-123.jpg',
    'corn-minced-pork.png',
    'ftp://example.com/storage/v1/object/public/recipes/x.png',
    `${ORIGIN}/storage/v1/object/sign/recipes/x.png`,
  ]) {
    assert.equal(recipeVariantUrl(value, 'thumb'), null, value);
    assert.equal(recipeVariantUrl(value, 'detail'), null, value);
  }
});

test('an already-derived variants/ URL is not double-derived', () => {
  assert.equal(
    recipeVariantUrl(`${PUBLIC}/variants/thumb/corn-minced-pork.webp`, 'detail'),
    null,
  );
});

test('initial phase: no original -> emoji, immediately, no network', () => {
  assert.equal(
    initialRecipeImagePhase({ variantUri: null, originalUri: null }),
    'emoji',
  );
  assert.equal(
    initialRecipeImagePhase({
      variantUri: `${PUBLIC}/variants/thumb/x.webp`,
      originalUri: null,
    }),
    'emoji',
  );
});

test('initial phase: original but no derivable variant -> original', () => {
  assert.equal(
    initialRecipeImagePhase({
      variantUri: null,
      originalUri: `${PUBLIC}/x.png`,
    }),
    'original',
  );
});

test('initial phase: variant + original -> variant', () => {
  assert.equal(
    initialRecipeImagePhase({
      variantUri: `${PUBLIC}/variants/thumb/x.webp`,
      originalUri: `${PUBLIC}/x.png`,
    }),
    'variant',
  );
});

test('fallback advances one-way variant -> original -> emoji and never loops', () => {
  const sources = {
    variantUri: `${PUBLIC}/variants/thumb/x.webp`,
    originalUri: `${PUBLIC}/x.png`,
  };
  const afterVariant = nextRecipeImagePhase('variant', sources);
  assert.equal(afterVariant, 'original');
  const afterOriginal = nextRecipeImagePhase(afterVariant, sources);
  assert.equal(afterOriginal, 'emoji');
  // Terminal: stays emoji no matter how many more errors arrive.
  assert.equal(nextRecipeImagePhase(afterOriginal, sources), 'emoji');
});

test('fallback short-circuits variant -> emoji when there is no original', () => {
  assert.equal(
    nextRecipeImagePhase('variant', { originalUri: null }),
    'emoji',
  );
});

test('recipeImageUriForPhase maps phase -> uri (emoji => null)', () => {
  const sources = {
    variantUri: `${PUBLIC}/variants/thumb/x.webp`,
    originalUri: `${PUBLIC}/x.png`,
  };
  assert.equal(recipeImageUriForPhase('variant', sources), sources.variantUri);
  assert.equal(recipeImageUriForPhase('original', sources), sources.originalUri);
  assert.equal(recipeImageUriForPhase('emoji', sources), null);
});

test('thumb/hero source helpers pick the right variant + carry the original', () => {
  const recipe = { image_url: `${PUBLIC}/x.png` };
  assert.deepEqual(recipeThumbSources(recipe), {
    variantUri: `${PUBLIC}/variants/thumb/x.webp`,
    originalUri: `${PUBLIC}/x.png`,
  });
  assert.deepEqual(recipeHeroSources(recipe), {
    variantUri: `${PUBLIC}/variants/detail/x.webp`,
    originalUri: `${PUBLIC}/x.png`,
  });
  assert.deepEqual(recipeThumbSources({ image_url: null }), {
    variantUri: null,
    originalUri: null,
  });
});
