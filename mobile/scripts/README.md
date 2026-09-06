# mobile/scripts

Dev / ops scripts. **Not part of the mobile app runtime** — nothing here is
imported by `expo-router/entry` or shipped in a build.

## generate-image-variants.mjs

Pre-generates derived WebP variants of the recipe images and uploads them to
Supabase Storage, **leaving every original object untouched**.

| variant | path in `recipes` bucket                     | size            | quality |
|---------|----------------------------------------------|-----------------|---------|
| thumb   | `variants/thumb/<base>.webp`                 | 240×240 cover   | q70     |
| detail  | `variants/detail/<base>.webp`               | width 900, no upscale | q74 |

`<base>` = the original object path inside the bucket minus its extension
(`corn-minced-pork.png` → `corn-minced-pork`). The mapping is deterministic; the
app derives the same URLs from `recipes.image_url` with no DB column and no
lookup — see `src/features/recipes/lib/recipeImageUrl.ts`.

### Requirements

- Run from the **repository root**. `sharp` is a declared repo-root
  **devDependency** (`/package.json` → `devDependencies.sharp`), so the install
  is reproducible rather than an accidental hoist of Next.js's optional `sharp`.
  It is deliberately not a `mobile/` runtime dependency and is never bundled
  into the app.
- Node ≥ 20 (uses global `fetch`); tested on Node 22.

### Environment

| var | purpose |
|-----|---------|
| `SUPABASE_URL` (or `EXPO_PUBLIC_SUPABASE_URL`) | project URL |
| `SUPABASE_ANON_KEY` (or `EXPO_PUBLIC_SUPABASE_ANON_KEY`) | list the recipe rows |
| `SUPABASE_SERVICE_ROLE_KEY` | **uploads only.** Not needed for `--dry-run`. Never commit it; the script never prints it. |

### Examples

```bash
# generate 5 samples locally + measure, NO uploads:
node mobile/scripts/generate-image-variants.mjs \
  --slugs cucumber-scrambled-egg,long-bean-scrambled-egg,dried-shrimp-vermicelli-napa,potato-braised-chicken-wings,salt-pepper-tofu \
  --out /tmp/variants --dry-run

# upload those 5 (needs the service-role key):
SUPABASE_SERVICE_ROLE_KEY=… node mobile/scripts/generate-image-variants.mjs \
  --slugs cucumber-scrambled-egg,long-bean-scrambled-egg,dried-shrimp-vermicelli-napa,potato-braised-chicken-wings,salt-pepper-tofu

# full catalog — ONLY after the production gate is approved:
SUPABASE_SERVICE_ROLE_KEY=… node mobile/scripts/generate-image-variants.mjs --all
```

### Safety

- Idempotent — skips a target that already exists.
- **No overwrite without `--force`.** A normal run uploads with no-upsert
  semantics (no `x-upsert` header), so a HEAD→POST race cannot clobber an
  object another writer just created; such a race is treated as a safe
  "already exists" skip. Only `--force` sends `x-upsert: true` to overwrite.
- **Source-URL hardening.** Every `recipes.image_url` is validated against its
  RAW path text *before* any WHATWG canonicalisation is trusted: `new URL` is
  used only for URL-shape / scheme / origin checks, then the path is taken
  exactly as written, must begin with the exact public `recipes/` bucket
  prefix, and every `/`-delimited segment is percent-decoded individually and
  rejected on a literal or `%5c` backslash, `.` / `..`, `%2e` / `%2e%2e`, an
  encoded slash, a NUL, malformed percent-encoding, or an empty (leading /
  trailing / doubled `/`) segment. A source already under `variants/` is
  refused. Legitimate percent-encoding (spaces, unicode) still round-trips.
- **Target-path proof.** Variant target paths are built only from validated
  segments and must normalise to a path that stays strictly under
  `variants/thumb/` or `variants/detail/`; the upload call re-asserts this at
  the write boundary.
- Fails per-image, not per-batch.
- `--dry-run` performs zero network writes.
- Originals are only ever GET-downloaded from their public URL, never rewritten.
- Unit tests for the path + upload handling:
  `mobile/scripts/generate-image-variants.test.mjs` (run via `npm test` in `mobile/`).
