/**
 * Recipe-detail JSON normalization — pure, shared.
 *
 * Single source of truth for turning a raw recipe-detail row into the
 * `RecipeDetail` the app renders, PLUS the list-with-detail variant built on
 * top of it: `get_recipe_list_with_detail_json` returns the exact same
 * per-recipe shape `get_recipe_detail_json` does (plus one extra field,
 * `slug`), so this file maps both instead of duplicating null-coercion and
 * field-mapping rules a second time. See
 * `list-detail-contract-slice-design.md` §"MAPPING" for the decision.
 *
 * `fetchRecipeDetail.ts` re-exports `mapRecipeDetail` from here so nothing
 * importing it from that path needs to change. `fetchRecipeListWithDetail.ts`
 * imports `mapRecipeListRows` / `warmRecipeDetailCache` from here directly.
 *
 * Deliberately zero relative/`@/` VALUE imports (only a type-only
 * `@/types/recipe` import, which `--experimental-strip-types` erases
 * entirely) so this file loads under this repo's `node --test` runner and is
 * directly unit-testable without a live Supabase client or a bundler's
 * module resolution — the same reason `recipeDetailPrefetchCore.ts` takes
 * zero relative imports (see that file's header for the fuller rationale:
 * Node's ESM loader requires explicit file extensions on relative
 * specifiers, which plain `tsc`/Metro compilation does not use and this
 * repo does not enable `allowImportingTsExtensions` to work around — so any
 * module that itself needs cross-file reuse and must also be `node --test`
 * loadable keeps that reuse INSIDE one extension-free file rather than
 * spreading it across relatively-imported siblings).
 */
import type {
  RecipeDetail,
  RecipeDetailIngredient,
  RecipeDetailStep,
  RecipeListDetail,
  RecipeSummary,
} from '@/types/recipe';

export interface RawUnit {
  code?: string | null;
  name?: string | null;
}
export interface RawIngredient {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  shopping_category?: string | null;
  quantity?: number | null;
  unit?: RawUnit | null;
}
export interface RawStep {
  step_no?: number | null;
  text?: string | null;
  time_seconds?: number | null;
}

/** Shape of one recipe as returned by `get_recipe_detail_json`, and as
 *  embedded per-row (minus `slug`) by `get_recipe_list_with_detail_json`. */
export interface RawRecipeDetail {
  id: string;
  name: string;
  image_url?: string | null;
  description?: string | null;
  cuisine?: string | null;
  difficulty?: string | null;
  method?: string | null;
  total_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  prep_time_minutes?: number | null;
  primary_protein?: string | null;
  ingredients?: RawIngredient[] | null;
  steps?: RawStep[] | null;
}

/** One row of `get_recipe_list_with_detail_json`'s response: the same shape
 *  above, plus `slug` — the list needs it for routing/cache-keying; the
 *  single-recipe RPC omits it because the caller already supplies an
 *  identifier. */
export type RawListRow = RawRecipeDetail & { slug?: string | null };

const FALLBACK_RECIPE_NAME = '未命名食譜';

export function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function mapIngredient(raw: RawIngredient): RecipeDetailIngredient {
  const unit = raw.unit;
  return {
    id: toNullableString(raw.id) ?? '',
    name: toNullableString(raw.name) ?? '',
    slug: toNullableString(raw.slug),
    shopping_category: toNullableString(raw.shopping_category),
    quantity: toNullableNumber(raw.quantity),
    unit:
      unit && typeof unit === 'object'
        ? {
            code: toNullableString(unit.code) ?? '',
            name: toNullableString(unit.name) ?? '',
          }
        : null,
  };
}

export function mapStep(raw: RawStep): RecipeDetailStep {
  return {
    step_no: toNullableNumber(raw.step_no) ?? 0,
    text: toNullableString(raw.text) ?? '',
    time_seconds: toNullableNumber(raw.time_seconds),
  };
}

/**
 * Normalize one raw recipe-detail payload. Ingredient / step arrays keep
 * their RPC order — never re-sorted here.
 */
export function mapRecipeDetail(raw: RawRecipeDetail): RecipeDetail {
  return {
    id: raw.id,
    name: toNullableString(raw.name) ?? FALLBACK_RECIPE_NAME,
    image_url: toNullableString(raw.image_url),
    description: toNullableString(raw.description),
    cuisine: toNullableString(raw.cuisine),
    difficulty: toNullableString(raw.difficulty),
    method: toNullableString(raw.method),
    total_time_minutes: toNullableNumber(raw.total_time_minutes),
    cook_time_minutes: toNullableNumber(raw.cook_time_minutes),
    prep_time_minutes: toNullableNumber(raw.prep_time_minutes),
    primary_protein: toNullableString(raw.primary_protein),
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map(mapIngredient)
      : [],
    steps: Array.isArray(raw.steps) ? raw.steps.map(mapStep) : [],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate one list row before mapping it. Deliberately separate from
 * `fetchRecipeDetail.ts`'s private `assertValidDetailPayload` (detail-fetch
 * specific error wording keyed by the caller's `idOrSlug`) — this one is
 * keyed by array index, since a list row has no caller-supplied identifier.
 */
function assertValidListRow(
  row: unknown,
  index: number,
): asserts row is RawListRow {
  const invalid = (reason: string): never => {
    throw new Error(
      `Recipe list query failed: malformed row at index ${index} (${reason})`,
    );
  };
  if (!isPlainObject(row)) {
    invalid('not a JSON object');
  }
  const record = row as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.trim() === '') {
    invalid('missing non-empty string id');
  }
  if (typeof record.name !== 'string') {
    invalid('missing string name');
  }
}

/** Map one already-validated list row to the shape list and detail UI share. */
export function mapListRow(row: RawListRow): RecipeListDetail {
  const detail: RecipeDetail = mapRecipeDetail(row);
  return { ...detail, slug: toNullableString(row.slug) };
}

/**
 * Validate `get_recipe_list_with_detail_json`'s top-level shape (must be a
 * JSON array) and map every row.
 *
 * ALL-OR-NOTHING: throws on the FIRST invalid row instead of returning a
 * partial array — `Array.prototype.map`'s callback throwing propagates
 * synchronously out of this function before it can return anything, so a
 * caller can never observe (or cache-warm from) a partially-mapped list.
 */
export function mapRecipeListRows(data: unknown): RecipeListDetail[] {
  if (!Array.isArray(data)) {
    throw new Error('Recipe list query failed: RPC did not return a JSON array');
  }
  return data.map((row, index) => {
    assertValidListRow(row, index);
    return mapListRow(row);
  });
}

/** Structural shape of the cache-write method `warmRecipeDetailCache` needs
 *  — matches `RecipeDetailCache.set` (`../services/recipeDetailCache`)
 *  without importing its class as a value (referenced here only as an
 *  inline structural type — the same technique `recipeDetailPrefetchCore.ts`
 *  uses for its own cache-writer type). */
export interface DetailCacheWriter {
  set(idOrSlug: string | null | undefined, detail: RecipeDetail): void;
}

/**
 * Warm `cache` with every row of an already-fully-mapped list. Each row is
 * stored under its own identifier (slug, falling back to the resolved UUID
 * `id`), which `RecipeDetailCache.set` already aliases under BOTH that key
 * and the row's `id` — so this loop alone creates both the slug and UUID
 * cache entries for every recipe. The SAME row object references passed in
 * are the ones stored — nothing is cloned or re-parsed, so list state and
 * the cache end up sharing identical objects, not duplicate copies.
 */
export function warmRecipeDetailCache(
  rows: readonly RecipeListDetail[],
  cache: DetailCacheWriter,
): void {
  for (const row of rows) {
    cache.set(row.slug ?? row.id, row);
  }
}

/**
 * Warm `cache` with `rows` UNLESS `isCurrent()` says this run has been
 * superseded (a newer background load already started, or the component
 * unmounted) — checked once, immediately before the write, so a slow/stale
 * background response can never overwrite a newer one's cache entries. The
 * write itself stays a single synchronous loop (`warmRecipeDetailCache`), so
 * there is no window between the staleness check and the write where another
 * caller could interleave a partial state.
 *
 * Returns whether the cache was actually written (only useful for tests/
 * diagnostics — callers should not need to branch on it).
 */
export function warmRecipeDetailCacheIfCurrent(
  rows: readonly RecipeListDetail[],
  cache: DetailCacheWriter,
  isCurrent: () => boolean,
): boolean {
  if (!isCurrent()) return false;
  warmRecipeDetailCache(rows, cache);
  return true;
}

/** Structural shape of the cache-invalidate method `useRecipes` Stage 1
 *  needs — matches `RecipeDetailCache.invalidate`
 *  (`../services/recipeDetailCache`) without importing its class as a value
 *  (referenced here only as an inline structural type, same technique as
 *  `DetailCacheWriter` above). */
export interface DetailCacheInvalidator {
  invalidate(idOrSlug: string | null | undefined): number;
}

/**
 * Drop any existing detail-cache entry for every row in a freshly-loaded
 * summary list, under BOTH its slug and its UUID id.
 *
 * Why: `recipeDetailCache` lives for the whole session, so a recipe cached
 * from an earlier list load (or an earlier session-scoped background warm)
 * would otherwise keep being served forever, even after a fresh summary
 * reload proves the app is looking at this recipe again right now. Calling
 * this BEFORE a summary load is exposed as `success` guarantees the
 * subsequent background detail warm (or an on-demand open that lands before
 * that warm finishes) can only ever produce a fresh cache entry, never a
 * stale one left over from before this load.
 */
export function invalidateStaleRecipeDetailAliases(
  rows: readonly RecipeSummary[],
  cache: DetailCacheInvalidator,
): void {
  for (const row of rows) {
    cache.invalidate(row.slug);
    cache.invalidate(row.id == null ? null : String(row.id));
  }
}
