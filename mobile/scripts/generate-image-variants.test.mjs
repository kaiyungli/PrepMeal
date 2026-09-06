/**
 * Unit tests for the SOURCE-URL / TARGET-PATH hardening in
 * generate-image-variants.mjs. Focus: dot-segment and encoded path-traversal
 * attacks must never reach a download or a Storage write.
 *
 * Run with: `npm test` (from mobile/). Importing the generator only pulls in the
 * pure helpers — `main()` is guarded to run only on direct invocation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRecipeSourceUrl,
  buildVariantTargetPath,
  assertUploadTargetSafe,
  decodeSegmentStrict,
  encodeSegments,
  uploadHeaders,
  looksLikeDuplicate,
} from './generate-image-variants.mjs';

const ORIGIN = 'https://hivnajhqqvaokthzhugx.supabase.co';
const PUBLIC = `${ORIGIN}/storage/v1/object/public/recipes`;

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test('parses a normal recipes-bucket URL into validated segments + base', () => {
  const r = parseRecipeSourceUrl(`${PUBLIC}/corn-minced-pork.png`, ORIGIN);
  assert.equal(r.ok, true);
  assert.deepEqual(r.segments, ['corn-minced-pork.png']);
  assert.deepEqual(r.baseSegments, ['corn-minced-pork']);
  assert.equal(r.base, 'corn-minced-pork');
});

test('parses a nested object path and ignores query / hash', () => {
  const r = parseRecipeSourceUrl(`${PUBLIC}/sub/dir/dish.jpeg?token=abc#frag`, ORIGIN);
  assert.equal(r.ok, true);
  assert.deepEqual(r.baseSegments, ['sub', 'dir', 'dish']);
  assert.equal(buildVariantTargetPath('thumb', r.baseSegments), 'variants/thumb/sub/dir/dish.webp');
  assert.equal(buildVariantTargetPath('detail', r.baseSegments), 'variants/detail/sub/dir/dish.webp');
});

test('a segment with a legitimate space round-trips through encodeSegments', () => {
  const r = parseRecipeSourceUrl(`${PUBLIC}/my%20dish.png`, ORIGIN);
  assert.equal(r.ok, true);
  assert.deepEqual(r.segments, ['my dish.png']);
  assert.equal(r.base, 'my dish');
  assert.equal(encodeSegments(r.segments), 'my%20dish.png');
});

test('legitimate percent-encoded unicode still works', () => {
  const r = parseRecipeSourceUrl(`${PUBLIC}/caf%C3%A9/plat%20du%20jour.png`, ORIGIN);
  assert.equal(r.ok, true);
  assert.deepEqual(r.segments, ['café', 'plat du jour.png']);
  assert.equal(r.base, 'café/plat du jour');
  assert.equal(buildVariantTargetPath('thumb', r.baseSegments), 'variants/thumb/café/plat du jour.webp');
});

// ---------------------------------------------------------------------------
// Origin / prefix / scheme
// ---------------------------------------------------------------------------

for (const [label, url] of [
  ['non-string', 123],
  ['empty', '   '],
  ['not a URL', 'corn-minced-pork.png'],
  ['wrong origin', 'https://evil.example.com/storage/v1/object/public/recipes/x.png'],
  ['look-alike host', 'https://hivnajhqqvaokthzhugx.supabase.co.evil.com/storage/v1/object/public/recipes/x.png'],
  ['non-http scheme', 'ftp://hivnajhqqvaokthzhugx.supabase.co/storage/v1/object/public/recipes/x.png'],
  ['signed-URL scope, not public', `${ORIGIN}/storage/v1/object/sign/recipes/x.png`],
  ['different bucket', `${ORIGIN}/storage/v1/object/public/other/x.png`],
  ['prefix present but not at path start', `${ORIGIN}/evil/storage/v1/object/public/recipes/x.png`],
]) {
  test(`rejects: ${label}`, () => {
    const r = parseRecipeSourceUrl(url, ORIGIN);
    assert.equal(r.ok, false, `${label} should be rejected`);
    assert.equal(typeof r.reason, 'string');
  });
}

// ---------------------------------------------------------------------------
// Dot-segment / encoded traversal — the core of FIX 1
// ---------------------------------------------------------------------------

for (const [label, url] of [
  ['literal ../ escaping the bucket', `${PUBLIC}/../../secret/x.png`],
  ['literal ../ deep within the path', `${PUBLIC}/sub/../../../secret/x.png`],
  ['literal backslash traversal (\\ treated as /) escaping the bucket', `${PUBLIC}/sub\\..\\..\\..\\secret\\x.png`],
  ['encoded .. dot-segment escaping the bucket (%2e%2e)', `${PUBLIC}/%2e%2e/secret.png`],
  ['encoded .. dot-segment escaping the bucket (%2E%2E)', `${PUBLIC}/%2E%2E/x.png`],
  ['encoded slash (%2f)', `${PUBLIC}/a%2Fb.png`],
  ['encoded slash used for traversal (%2f..%2f..%2f)', `${PUBLIC}/dir%2f..%2f..%2fx.png`],
  ['encoded backslash (%5c)', `${PUBLIC}/a%5Cb.png`],
  ['malformed percent (%2)', `${PUBLIC}/foo%2.png`],
  ['malformed percent (%zz)', `${PUBLIC}/foo%zz.png`],
  ['NUL byte (%00)', `${PUBLIC}/a%00b.png`],
  ['double slash -> empty segment', `${PUBLIC}/a//b.png`],
  ['trailing slash (directory)', `${PUBLIC}/subdir/`],
  ['empty object path', `${PUBLIC}/`],
  ['already a derived variants/ path', `${PUBLIC}/variants/thumb/x.webp`],
  ['already a derived variants/detail path', `${PUBLIC}/variants/detail/sub/x.webp`],
  ['filename is only an extension', `${PUBLIC}/.png`],
]) {
  test(`rejects traversal / pathological: ${label}`, () => {
    const r = parseRecipeSourceUrl(url, ORIGIN);
    assert.equal(r.ok, false, `${label} should be rejected`);
  });
}

test('a rejected source never yields base segments to build a target from', () => {
  const r = parseRecipeSourceUrl(`${PUBLIC}/%2e%2e/%2e%2e/config.png`, ORIGIN);
  assert.equal(r.ok, false);
  assert.equal(r.baseSegments, undefined);
});

// These rely on WHATWG canonicalisation to become "safe". The raw-path check
// now rejects them outright (FIX 1) — they must never be accepted, even though
// `new URL()` would quietly rewrite them into an in-bucket object.
for (const [label, url] of [
  ['single %2e (decodes to ".")', `${PUBLIC}/%2e/dish.png`],
  ['in-bucket %2e%2e (decodes to "..")', `${PUBLIC}/sub/%2e%2e/dish.png`],
  ['literal backslash used as a separator', `${PUBLIC}/sub\\dish.png`],
  ['literal "." path segment', `${PUBLIC}/./dish.png`],
  ['literal ".." path segment (in-bucket)', `${PUBLIC}/sub/../dish.png`],
  ['mixed-case %2E%2E', `${PUBLIC}/%2E%2E/dish.png`],
  ['leading "//" (doubled separator)', `${ORIGIN}//storage/v1/object/public/recipes/dish.png`],
]) {
  test(`raw-path check rejects normalisation-sensitive source: ${label}`, () => {
    const r = parseRecipeSourceUrl(url, ORIGIN);
    assert.equal(r.ok, false, `${label} must be rejected`);
    assert.equal(typeof r.reason, 'string');
  });
}

// ---------------------------------------------------------------------------
// decodeSegmentStrict directly
// ---------------------------------------------------------------------------

test('decodeSegmentStrict accepts a plain segment and decodes escapes', () => {
  assert.equal(decodeSegmentStrict('corn-minced-pork.png'), 'corn-minced-pork.png');
  assert.equal(decodeSegmentStrict('caf%C3%A9.png'), 'café.png');
});

for (const bad of ['', '.', '..', '%2e', '%2e%2e', 'a%2Fb', 'a%5Cb', 'a\\b', 'x%2', 'x%zz', 'a%00b']) {
  test(`decodeSegmentStrict throws on ${JSON.stringify(bad)}`, () => {
    assert.throws(() => decodeSegmentStrict(bad));
  });
}

// ---------------------------------------------------------------------------
// buildVariantTargetPath — targets only from validated segments
// ---------------------------------------------------------------------------

test('buildVariantTargetPath builds under exactly variants/thumb|detail', () => {
  assert.equal(buildVariantTargetPath('thumb', ['a', 'b']), 'variants/thumb/a/b.webp');
  assert.equal(buildVariantTargetPath('detail', ['dish']), 'variants/detail/dish.webp');
});

for (const bad of [
  ['..'],
  ['.', 'x'],
  ['a/b'],
  ['a\\b'],
  ['a\0b'],
  ['x', ''],
  [],
]) {
  test(`buildVariantTargetPath rejects base segments ${JSON.stringify(bad)}`, () => {
    assert.throws(() => buildVariantTargetPath('thumb', bad));
  });
}

test('buildVariantTargetPath rejects an unknown variant', () => {
  assert.throws(() => buildVariantTargetPath('huge', ['x']));
});

// ---------------------------------------------------------------------------
// assertUploadTargetSafe — the final write-boundary proof
// ---------------------------------------------------------------------------

test('assertUploadTargetSafe accepts a proven variant target', () => {
  assert.doesNotThrow(() => assertUploadTargetSafe('variants/thumb/a/b.webp'));
  assert.doesNotThrow(() => assertUploadTargetSafe('variants/detail/dish.webp'));
});

for (const bad of [
  'variants/x.webp',
  'variants/thumb',
  'variants/thumb/',
  'other/thumb/a.webp',
  'variants/thumb/../evil.webp',
  '../variants/thumb/a.webp',
  'variants/thumb/a\\b.webp',
  'variants/thumb/a\0b.webp',
  '/variants/thumb/a.webp',
  '',
]) {
  test(`assertUploadTargetSafe blocks ${JSON.stringify(bad)}`, () => {
    assert.throws(() => assertUploadTargetSafe(bad), /BLOCKED/);
  });
}

// ---------------------------------------------------------------------------
// FIX 3 — no-overwrite semantics unless --force
// ---------------------------------------------------------------------------

test('normal upload headers do NOT enable upsert', () => {
  const h = uploadHeaders('svc-key');
  assert.equal(h['x-upsert'], undefined);
  assert.equal(h['Content-Type'], 'image/webp');
  assert.equal(h.Authorization, 'Bearer svc-key');
  assert.equal(h['Cache-Control'], 'public, max-age=31536000, immutable');
});

test('--force upload headers DO enable upsert', () => {
  const h = uploadHeaders('svc-key', { force: true });
  assert.equal(h['x-upsert'], 'true');
});

test('looksLikeDuplicate recognises a Supabase no-upsert collision', () => {
  assert.equal(looksLikeDuplicate(409, ''), true);
  assert.equal(
    looksLikeDuplicate(400, '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}'),
    true,
  );
  assert.equal(looksLikeDuplicate(400, 'the resource already exists'), true);
});

test('looksLikeDuplicate does NOT swallow a genuine upload error', () => {
  assert.equal(looksLikeDuplicate(400, '{"error":"Bad Request","message":"invalid webp"}'), false);
  assert.equal(looksLikeDuplicate(413, 'payload too large'), false);
  assert.equal(looksLikeDuplicate(500, 'internal error'), false);
});
