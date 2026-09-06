#!/usr/bin/env node
/**
 * generate-image-variants.mjs — DEV / OPS SCRIPT. NOT part of the mobile runtime.
 *
 * Produces derived WebP variants of the recipe images and (optionally) uploads
 * them to Supabase Storage, leaving every original object untouched.
 *
 *   original  recipes/<base>.<ext>            (never read for write, never modified)
 *   thumb     recipes/variants/thumb/<base>.webp     240x240  cover   q70
 *   detail    recipes/variants/detail/<base>.webp    w=900    inside  q74  (never upscaled)
 *
 * `<base>` is the original object path inside the `recipes` bucket, minus its
 * extension — e.g. `corn-minced-pork.png` -> base `corn-minced-pork`. The
 * mapping is fully deterministic; the mobile app derives the same URLs from
 * `recipes.image_url` with no lookup (see src/features/recipes/lib/recipeImageUrl.ts).
 *
 * SAFETY / SECURITY
 *   - Reads the privileged key ONLY from the environment
 *     (SUPABASE_SERVICE_ROLE_KEY). Never hard-coded, never printed, never logged.
 *   - Refuses to write to any path outside `variants/thumb|detail/`.
 *   - Source `image_url`s are validated against their RAW path text before any
 *     WHATWG canonicalisation — a normalisation-sensitive trick (`\`, `%5c`,
 *     `.`/`..`, `%2e`/`%2e%2e`, `%2f`, `//`, malformed `%`) is rejected outright.
 *   - Idempotent: skips a target that already exists (unless --force).
 *   - No-overwrite by default: a normal upload uses no-upsert semantics, so a
 *     HEAD->POST race cannot clobber an object another writer just created.
 *     Only --force sends `x-upsert: true`.
 *   - Fails per-image, not per-batch: one bad source is reported and skipped.
 *   - --dry-run performs zero network writes.
 *   - Originals are only ever GET-downloaded (public URL), never rewritten.
 *
 * DEPENDENCIES
 *   Uses `sharp`. It is declared as a repo-ROOT devDependency
 *   (`/package.json` -> devDependencies.sharp) so the install is reproducible
 *   and not an accidental hoist of Next.js's optional `sharp`. Run this script
 *   from the repository root; `sharp` is resolved from the root node_modules.
 *   It is deliberately NOT in the mobile app's runtime deps
 *   (`mobile/package.json`) and is never bundled into the app.
 *
 * USAGE (run from the repository root)
 *   # list what would be done for 5 sample recipes, generate locally, measure:
 *   node mobile/scripts/generate-image-variants.mjs \
 *     --slugs cucumber-scrambled-egg,long-bean-scrambled-egg,dried-shrimp-vermicelli-napa,potato-braised-chicken-wings,salt-pepper-tofu \
 *     --out /tmp/variants --dry-run
 *
 *   # actually upload those 5 (requires SUPABASE_SERVICE_ROLE_KEY in env):
 *   SUPABASE_SERVICE_ROLE_KEY=... node mobile/scripts/generate-image-variants.mjs \
 *     --slugs cucumber-scrambled-egg,... --out /tmp/variants
 *
 *   # full catalog (ONLY after the production gate is approved):
 *   SUPABASE_SERVICE_ROLE_KEY=... node mobile/scripts/generate-image-variants.mjs --all
 *
 * FLAGS
 *   --all                 process every public recipe with a non-null image_url
 *   --slugs a,b,c         process only these recipe slugs
 *   --limit N             process at most N recipes (after any --slugs filter)
 *   --out <dir>           also write generated variants to <dir> for inspection
 *   --dry-run             compute + generate locally, but perform NO uploads
 *   --force               overwrite an existing target (sends x-upsert; without
 *                         this a normal run never overwrites)
 *   --concurrency N       parallel recipes (default 4)
 *   --json                emit a machine-readable JSON report to stdout
 *
 * ENV
 *   SUPABASE_URL                 (or EXPO_PUBLIC_SUPABASE_URL) — project URL
 *   SUPABASE_ANON_KEY            (or EXPO_PUBLIC_SUPABASE_ANON_KEY) — for the REST recipe list
 *   SUPABASE_SERVICE_ROLE_KEY    — required for uploads; NOT required for --dry-run
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error(
    'FATAL: could not resolve `sharp`. Run this script from the repository root\n' +
      '       (sharp lives in the root node_modules, not in mobile/).',
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Config — the approved technical direction. Change deliberately, not casually.
// ---------------------------------------------------------------------------
const BUCKET = 'recipes';
const VARIANT_SPECS = {
  thumb: {
    prefix: 'variants/thumb',
    resize: { width: 240, height: 240, fit: 'cover', withoutEnlargement: false },
    webp: { quality: 70 },
  },
  detail: {
    prefix: 'variants/detail',
    resize: { width: 900, fit: 'inside', withoutEnlargement: true },
    webp: { quality: 74 },
  },
};
const VARIANT_KEYS = Object.keys(VARIANT_SPECS);
const OBJECT_PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {
    all: false,
    slugs: null,
    limit: Infinity,
    out: null,
    dryRun: false,
    force: false,
    concurrency: 4,
    json: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--json') args.json = true;
    else if (a === '--slugs') args.slugs = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--limit') args.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--concurrency') args.concurrency = Math.max(1, parseInt(argv[++i], 10) || 1);
    else {
      console.error(`Unknown flag: ${a}`);
      process.exit(2);
    }
  }
  if (!args.all && !args.slugs) {
    console.error('Refusing to run: pass --all or --slugs a,b,c (see header for usage).');
    process.exit(2);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
function readEnv() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url) {
    console.error('FATAL: SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) is not set.');
    process.exit(2);
  }
  return { url: url.replace(/\/$/, ''), anon, serviceKey };
}

// ---------------------------------------------------------------------------
// Deterministic mapping — kept in lock-step with the mobile helper.
//
// SOURCE URL HARDENING. `recipes.image_url` is attacker-influenceable data and
// this script writes to Storage with the service-role key, so every source URL
// is validated against its RAW path text BEFORE any WHATWG canonicalisation is
// trusted to have made it safe, and BEFORE anything is downloaded or any target
// path is constructed:
//   - parsed with `new URL` only to (a) reject non-URLs / non-http schemes and
//     (b) compare the origin against the configured Supabase project origin
//   - the path component is then taken EXACTLY as written in the raw string and
//     must begin with the exact public recipes-bucket prefix
//   - each "/"-delimited RAW segment is percent-decoded on its own and rejected
//     if it is empty (leading / trailing / doubled "/"), `.`, `..`, decodes to
//     `.` / `..` (`%2e` / `%2e%2e`), contains a slash / backslash / NUL, holds a
//     literal or `%5c` backslash, or is malformed percent-encoding — so an
//     encoded separator or dot-segment can never survive normalisation
//   - a source already under `variants/` is refused
//   - targets are assembled ONLY from the validated segments and proven to
//     normalise to a path that stays strictly under `variants/thumb/` or
//     `variants/detail/`
// Legitimate percent-encoding (spaces, unicode) still round-trips normally.
// `startsWith` is never trusted on its own before this validation.
// ---------------------------------------------------------------------------

const ALLOWED_TARGET_PREFIXES = Object.freeze(
  VARIANT_KEYS.map((k) => `${VARIANT_SPECS[k].prefix}/`),
);

/** Decode + validate ONE path segment. Returns the decoded segment or throws. */
export function decodeSegmentStrict(rawSegment) {
  if (typeof rawSegment !== 'string' || rawSegment === '') {
    throw new Error('empty path segment (leading, trailing, or doubled "/")');
  }
  if (/%(?![0-9a-fA-F]{2})/.test(rawSegment)) {
    throw new Error('malformed percent-encoding');
  }
  if (/%5c/i.test(rawSegment) || rawSegment.includes('\\')) {
    throw new Error('backslash in path');
  }
  let decoded;
  try {
    decoded = decodeURIComponent(rawSegment);
  } catch {
    throw new Error('malformed percent-encoding');
  }
  if (decoded.includes('/') || decoded.includes('\\')) {
    throw new Error('encoded path separator inside a segment');
  }
  if (decoded.includes('\0')) throw new Error('NUL byte in path');
  if (decoded === '.' || decoded === '..') {
    throw new Error('dot-segment ("." or "..") in path');
  }
  return decoded;
}

/**
 * Isolate the path component EXACTLY as written in the raw URL string, before
 * any WHATWG canonicalisation. Returns the path (with a leading "/"), `''` when
 * the URL has no path, or `null` when the string has no `scheme://` authority.
 */
export function rawObjectPathFromUrl(rawUrl) {
  const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(rawUrl);
  if (!scheme) return null;
  const afterAuthority = rawUrl.slice(scheme[0].length);
  const cut = afterAuthority.search(/[/?#]/);
  if (cut === -1) return '';
  const fromPath = afterAuthority.slice(cut);
  if (fromPath[0] !== '/') return '';
  const end = fromPath.search(/[?#]/);
  return end === -1 ? fromPath : fromPath.slice(0, end);
}

/**
 * Parse a recipe `image_url` into validated, decoded object-path segments.
 * `expectedOrigin` is the configured Supabase project URL (origin is compared).
 * Returns `{ ok:true, origin, segments, baseSegments, base }` or
 * `{ ok:false, reason }`.
 *
 * The RAW path text is validated first; `new URL` is used only for URL-shape /
 * scheme / origin checks, never trusted to normalise a hostile path into a safe
 * one.
 */
export function parseRecipeSourceUrl(imageUrl, expectedOrigin) {
  if (typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return { ok: false, reason: 'empty / non-string image_url' };
  }
  const raw = imageUrl.trim();

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'not a valid absolute URL' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: `unsupported protocol "${parsed.protocol}"` };
  }

  let expected;
  try {
    expected = new URL(expectedOrigin);
  } catch {
    return { ok: false, reason: 'invalid configured Supabase origin' };
  }
  if (parsed.origin !== expected.origin) {
    return {
      ok: false,
      reason: `origin "${parsed.origin}" != expected "${expected.origin}"`,
    };
  }

  // Validate the RAW path exactly as written — do NOT rely on `new URL` having
  // resolved `.` / `..` / `\` / `//` / `%2e` into something safe.
  const rawPath = rawObjectPathFromUrl(raw);
  if (rawPath === null || !rawPath.startsWith(OBJECT_PUBLIC_PREFIX)) {
    return { ok: false, reason: 'not a public recipes-bucket object path' };
  }
  const rawTail = rawPath.slice(OBJECT_PUBLIC_PREFIX.length);
  if (rawTail === '' || rawTail.endsWith('/')) {
    return { ok: false, reason: 'object path is empty or a directory' };
  }

  let segments;
  try {
    segments = rawTail.split('/').map(decodeSegmentStrict);
  } catch (err) {
    return { ok: false, reason: err.message };
  }

  // Belt-and-braces: a rebuilt POSIX path must equal a plain join and must not
  // climb out of its own directory or become absolute.
  const joined = segments.join('/');
  const normalised = path.posix.normalize(joined);
  if (
    normalised !== joined ||
    normalised === '.' ||
    normalised === '..' ||
    normalised.startsWith('../') ||
    path.posix.isAbsolute(normalised)
  ) {
    return { ok: false, reason: 'object path normalises outside its location' };
  }

  if (segments[0] === 'variants') {
    return { ok: false, reason: 'source is already a derived variants/ path' };
  }

  const last = segments[segments.length - 1];
  const baseLast = last.replace(/\.[^.]+$/, '');
  if (baseLast === '' || baseLast === '.' || baseLast === '..') {
    return { ok: false, reason: 'object filename has no usable base' };
  }
  const baseSegments = [...segments.slice(0, -1), baseLast];

  return {
    ok: true,
    origin: parsed.origin,
    segments,
    baseSegments,
    base: baseSegments.join('/'),
  };
}

/** Encode already-decoded, validated segments back into a request path. */
export function encodeSegments(segments) {
  return segments.map(encodeURIComponent).join('/');
}

/**
 * Build one variant's target object path from ALREADY-VALIDATED base segments.
 * Re-checks every segment, then proves the result normalises to a path that
 * stays strictly under `variants/<kind>/`. Throws otherwise — never returns an
 * unproven path.
 */
export function buildVariantTargetPath(variantKey, baseSegments) {
  const spec = VARIANT_SPECS[variantKey];
  if (!spec) throw new Error(`unknown variant "${variantKey}"`);
  if (!Array.isArray(baseSegments) || baseSegments.length === 0) {
    throw new Error('no base segments');
  }
  for (const seg of baseSegments) {
    if (
      typeof seg !== 'string' ||
      seg === '' ||
      seg === '.' ||
      seg === '..' ||
      seg.includes('/') ||
      seg.includes('\\') ||
      seg.includes('\0')
    ) {
      throw new Error(`invalid base segment: ${JSON.stringify(seg)}`);
    }
  }

  const prefixSegments = spec.prefix.split('/'); // e.g. ['variants', 'thumb']
  const lastIdx = baseSegments.length - 1;
  const targetSegments = [
    ...prefixSegments,
    ...baseSegments.slice(0, lastIdx),
    `${baseSegments[lastIdx]}.webp`,
  ];
  const target = targetSegments.join('/');

  const requiredPrefix = `${spec.prefix}/`;
  const normalised = path.posix.normalize(target);
  if (
    normalised !== target ||
    normalised.includes('..') ||
    !normalised.startsWith(requiredPrefix) ||
    normalised.length <= requiredPrefix.length
  ) {
    throw new Error(`refusing target outside ${requiredPrefix}: ${target}`);
  }
  return target;
}

/** Write-boundary assertion: never upload outside an allowed variant prefix. */
export function assertUploadTargetSafe(objectPath) {
  const normalised =
    typeof objectPath === 'string' ? path.posix.normalize(objectPath) : '';
  const safe =
    normalised !== '' &&
    normalised === objectPath &&
    !normalised.includes('..') &&
    !normalised.includes('\\') &&
    !normalised.includes('\0') &&
    ALLOWED_TARGET_PREFIXES.some(
      (p) => normalised.startsWith(p) && normalised.length > p.length,
    );
  if (!safe) {
    throw new Error(`BLOCKED upload to a non-variant path: ${objectPath}`);
  }
}

// ---------------------------------------------------------------------------
// Supabase REST / Storage (plain fetch — no SDK dependency)
// ---------------------------------------------------------------------------
async function listRecipes({ url, anon }) {
  const endpoint =
    `${url}/rest/v1/recipes?select=id,slug,name,image_url` +
    `&is_public=eq.true&image_url=not.is.null&order=created_at.desc&limit=100000`;
  const res = await fetch(endpoint, {
    headers: anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {},
  });
  if (!res.ok) {
    throw new Error(`recipe list failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Build a Storage request URL from a DECODED, already-validated object path.
 * Each segment is re-encoded individually so a segment that legitimately
 * contains a space / unicode is transmitted correctly and a stray separator
 * cannot survive round-tripping.
 */
function storageObjectUrl(baseUrl, scope, decodedObjectPath) {
  const encoded = decodedObjectPath.split('/').map(encodeURIComponent).join('/');
  const scopeSeg = scope ? `${scope}/` : '';
  return `${baseUrl}/storage/v1/object/${scopeSeg}${BUCKET}/${encoded}`;
}

async function objectExists({ url }, decodedObjectPath) {
  const res = await fetch(storageObjectUrl(url, 'public', decodedObjectPath), { method: 'HEAD' });
  return res.status === 200;
}

async function downloadOriginal({ url }, decodedObjectPath) {
  const res = await fetch(storageObjectUrl(url, 'public', decodedObjectPath));
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Storage upload headers. `x-upsert: true` is sent ONLY on a --force run; a
 * normal run omits it entirely so Storage refuses to overwrite an existing
 * object.
 */
export function uploadHeaders(serviceKey, { force = false } = {}) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  if (force) headers['x-upsert'] = 'true';
  return headers;
}

/**
 * True when a failed no-upsert upload response means "the object already exists"
 * (lost a create race after our HEAD check) rather than a real error. Supabase
 * Storage returns HTTP 409, or 400 with a `"statusCode":"409"` / `Duplicate`
 * body.
 */
export function looksLikeDuplicate(status, body) {
  if (status === 409) return true;
  if (status !== 400) return false;
  return /("statusCode"\s*:\s*"?409"?)|("error"\s*:\s*"Duplicate")|(resource already exists)|(already exists)/i.test(
    String(body ?? ''),
  );
}

/**
 * Upload one variant. Returns `{ status: 'uploaded' }` or, when a non-force
 * upload lost a create race, `{ status: 'exists' }` — it NEVER overwrites an
 * object it did not create. `--force` (`force: true`) explicitly opts into
 * overwrite via `x-upsert`.
 */
async function uploadObject({ url, serviceKey }, decodedObjectPath, buf, { force = false } = {}) {
  // Final, independent proof that the write target is under variants/thumb|detail.
  assertUploadTargetSafe(decodedObjectPath);
  const res = await fetch(storageObjectUrl(url, '', decodedObjectPath), {
    method: 'POST',
    headers: uploadHeaders(serviceKey, { force }),
    body: buf,
  });
  if (res.ok) return { status: 'uploaded' };

  const body = await res.text();
  if (!force && looksLikeDuplicate(res.status, body)) {
    return { status: 'exists' };
  }
  throw new Error(`upload failed: HTTP ${res.status} ${body.slice(0, 200)}`);
}

// ---------------------------------------------------------------------------
// Per-recipe work
// ---------------------------------------------------------------------------
async function processRecipe(ctx, recipe) {
  const { args, env } = ctx;
  const parsed = parseRecipeSourceUrl(recipe.image_url, env.url);
  const row = {
    slug: recipe.slug,
    base: parsed.ok ? parsed.base : null,
    source: parsed.ok ? parsed.segments.join('/') : null,
    variants: {},
    status: 'ok',
    error: null,
  };

  if (!parsed.ok) {
    row.status = 'skipped';
    row.error = `unsafe / unusable image_url: ${parsed.reason}`;
    return row;
  }

  const sourcePath = parsed.segments.join('/');

  let original;
  try {
    original = await downloadOriginal(env, sourcePath);
  } catch (err) {
    row.status = 'failed';
    row.error = `original download: ${err.message}`;
    return row;
  }

  let origMeta;
  try {
    origMeta = await sharp(original).metadata();
  } catch (err) {
    row.status = 'failed';
    row.error = `original decode: ${err.message}`;
    return row;
  }
  row.original = { bytes: original.length, width: origMeta.width, height: origMeta.height, format: origMeta.format };

  for (const key of VARIANT_KEYS) {
    const spec = VARIANT_SPECS[key];
    let target;
    try {
      target = buildVariantTargetPath(key, parsed.baseSegments);
    } catch (err) {
      row.variants[key] = { target: null, bytes: null, width: null, height: null, action: 'error', error: err.message };
      row.status = 'failed';
      row.error = row.error ? `${row.error}; ${key}: ${err.message}` : `${key}: ${err.message}`;
      continue;
    }
    const v = { target, bytes: null, width: null, height: null, action: null };
    try {
      if (!args.force && (await objectExists(env, target))) {
        v.action = 'skip-exists';
        row.variants[key] = v;
        continue;
      }
      const pipeline = sharp(original).rotate().resize(spec.resize).webp(spec.webp);
      const buf = await pipeline.toBuffer();
      const meta = await sharp(buf).metadata();
      v.bytes = buf.length;
      v.width = meta.width;
      v.height = meta.height;

      if (args.out) {
        const outPath = path.join(args.out, target);
        await mkdir(path.dirname(outPath), { recursive: true });
        await writeFile(outPath, buf);
      }

      if (args.dryRun) {
        v.action = 'dry-run';
      } else {
        if (!env.serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set — cannot upload (use --dry-run to generate locally)');
        const uploaded = await uploadObject(env, target, buf, { force: args.force });
        v.action = uploaded.status === 'exists' ? 'skip-exists-race' : 'uploaded';
      }
      row.variants[key] = v;
    } catch (err) {
      v.action = 'error';
      v.error = err.message;
      row.variants[key] = v;
      row.status = 'failed';
      row.error = row.error ? `${row.error}; ${key}: ${err.message}` : `${key}: ${err.message}`;
    }
  }
  return row;
}

async function mapWithConcurrency(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);
  const env = readEnv();

  if (!args.dryRun && !env.serviceKey) {
    console.error(
      'REFUSING TO RUN: uploads requested but SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
        'Set it in the environment, or pass --dry-run to only generate + measure locally.',
    );
    process.exit(2);
  }

  let recipes = await listRecipes(env);
  if (args.slugs) {
    const want = new Set(args.slugs);
    recipes = recipes.filter((r) => want.has(r.slug));
    const found = new Set(recipes.map((r) => r.slug));
    for (const s of args.slugs) if (!found.has(s)) console.error(`WARN: slug not found / not public / no image_url: ${s}`);
  }
  recipes = recipes.filter((r) => typeof r.image_url === 'string' && r.image_url).slice(0, args.limit);

  if (recipes.length === 0) {
    console.error('Nothing to do (no matching recipes).');
    process.exit(1);
  }

  console.error(
    `${args.dryRun ? '[DRY RUN] ' : ''}${recipes.length} recipe(s) · thumb 240x240 q70 · detail w900 q74 · ` +
      `concurrency ${args.concurrency}${args.out ? ` · out ${args.out}` : ''}`,
  );

  const rows = await mapWithConcurrency(recipes, args.concurrency, (r) => processRecipe({ args, env }, r));

  // ---- report ----
  let okCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let bytesOrig = 0;
  let bytesThumb = 0;
  let bytesDetail = 0;
  for (const row of rows) {
    if (row.status === 'ok') okCount += 1;
    else if (row.status === 'failed') failCount += 1;
    else skipCount += 1;
    if (row.original) bytesOrig += row.original.bytes;
    if (row.variants.thumb?.bytes) bytesThumb += row.variants.thumb.bytes;
    if (row.variants.detail?.bytes) bytesDetail += row.variants.detail.bytes;

    if (!args.json) {
      const o = row.original;
      const t = row.variants.thumb;
      const d = row.variants.detail;
      const line = [
        row.status === 'failed' ? 'FAIL' : row.status === 'skipped' ? 'SKIP' : ' OK ',
        row.slug.padEnd(34),
        o ? `orig ${(o.bytes / 1024).toFixed(0)}KB ${o.width}x${o.height}` : 'orig -',
        t ? `thumb ${t.bytes != null ? (t.bytes / 1024).toFixed(1) + 'KB ' + t.width + 'x' + t.height + ' [' + t.action + ']' : '[' + t.action + ']'}` : 'thumb -',
        d ? `detail ${d.bytes != null ? (d.bytes / 1024).toFixed(1) + 'KB ' + d.width + 'x' + d.height + ' [' + d.action + ']' : '[' + d.action + ']'}` : 'detail -',
      ].join('  ');
      console.error(line);
      if (row.error) console.error(`      ! ${row.error}`);
    }
  }

  const reduction = bytesOrig > 0 ? (1 - (bytesThumb + bytesDetail) / bytesOrig) * 100 : 0;
  const summary = {
    dryRun: args.dryRun,
    recipes: rows.length,
    ok: okCount,
    failed: failCount,
    skipped: skipCount,
    bytes: { original: bytesOrig, thumb: bytesThumb, detail: bytesDetail },
    reductionPctVsOriginalSum: Number(reduction.toFixed(2)),
  };

  if (args.json) {
    process.stdout.write(JSON.stringify({ summary, rows }, null, 2) + '\n');
  } else {
    console.error(
      `\n${args.dryRun ? '[DRY RUN] ' : ''}done: ${okCount} ok, ${failCount} failed, ${skipCount} skipped · ` +
        `Σorig ${(bytesOrig / 1024 / 1024).toFixed(2)}MB -> Σ(thumb+detail) ${((bytesThumb + bytesDetail) / 1024).toFixed(0)}KB ` +
        `(${reduction.toFixed(1)}% smaller)`,
    );
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// Run only when invoked directly (`node …/generate-image-variants.mjs`), not
// when imported by the unit tests, which exercise the pure helpers above.
const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch((err) => {
    console.error(`FATAL: ${err.message}`);
    process.exit(2);
  });
}
