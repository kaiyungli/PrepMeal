/**
 * Unit tests for the list -> detail seed navigation param codec.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { encodeRecipeSeed, decodeRecipeSeed } from './recipeSeedParam.ts';

const summary = {
  id: 'uuid-1',
  slug: 'corn-minced-pork',
  name: '粟米肉碎',
  image_url: 'https://x.supabase.co/storage/v1/object/public/recipes/corn-minced-pork.png',
  cuisine: 'cantonese',
  difficulty: 'easy',
  total_time_minutes: 20,
  primary_protein: 'pork',
};

test('encode -> decode round-trips a full summary', () => {
  const decoded = decodeRecipeSeed(encodeRecipeSeed(summary));
  assert.deepEqual(decoded, summary);
});

test('decode tolerates the param arriving as a string[]', () => {
  const decoded = decodeRecipeSeed([encodeRecipeSeed(summary)]);
  assert.equal(decoded?.slug, 'corn-minced-pork');
});

test('decode returns null for missing / empty / non-JSON input', () => {
  for (const value of [undefined, null, '', 'not json', '[]', '{']) {
    assert.equal(decodeRecipeSeed(value as unknown as string), null, String(value));
  }
});

test('decode rejects a payload missing a usable id or name', () => {
  assert.equal(decodeRecipeSeed(JSON.stringify({ name: 'x' })), null);
  assert.equal(decodeRecipeSeed(JSON.stringify({ id: 'x' })), null);
});

test('decode normalises blank optional fields to null', () => {
  const decoded = decodeRecipeSeed(
    JSON.stringify({ id: 7, name: 'x', slug: '', cuisine: '', total_time_minutes: 'nope' }),
  );
  assert.equal(decoded?.id, 7);
  assert.equal(decoded?.slug, null);
  assert.equal(decoded?.cuisine, null);
  assert.equal(decoded?.total_time_minutes, null);
  assert.equal(decoded?.primary_protein, null);
});
