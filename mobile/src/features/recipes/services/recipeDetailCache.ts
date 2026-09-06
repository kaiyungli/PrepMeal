/**
 * Session-only, bounded, in-memory cache for `RecipeDetail`.
 *
 * Purpose: a list→detail→back→detail loop should not re-pay the
 * `get_recipe_detail_json` RPC latency (~0.4–1.2 s) for a recipe already seen
 * this session. On a cache hit `useRecipeDetail` serves the stored detail
 * synchronously and does NOT call the RPC; an explicit `refetch()` bypasses the
 * cache and overwrites the entry.
 *
 * Deliberately minimal — no AsyncStorage, no persistence, no React Query / SWR,
 * no React context/provider. Just a module-scoped `Map` with LRU eviction.
 * State lives for the JS runtime's lifetime and is gone on app restart, so
 * staleness is bounded to a single session; there is no in-app recipe editing
 * for it to fight with.
 *
 * ALIASING: one recipe is stored under up to two keys — the request identifier
 * (usually a slug) and the resolved UUID `id`. The cache tracks which keys form
 * one recipe's alias group so a single `invalidate()` can drop ALL of them at
 * once. `useRecipeDetail` calls that when the RPC returns an authoritative
 * `RecipeNotFoundError`, so a deleted / unpublished recipe cannot keep being
 * served from a stale slug OR UUID alias. LRU eviction is likewise ATOMIC per
 * recipe: evicting the oldest entry evicts its whole alias group, so a recipe
 * can never be left half-cached under an untracked surviving alias.
 */
import type { RecipeDetail } from '@/types/recipe';

/** Max distinct cache entries. A recipe is stored under up to 2 keys (the
 *  request identifier — usually its slug — and its resolved UUID `id`).
 *  `useRecipes` warms this cache with every row of the current mobile list
 *  bound (`RECIPE_LIST_FIRST_PAGE_CEILING` in `fetchRecipes.ts`, currently
 *  200) so a list-originated detail open is always a cache hit — that's
 *  200 × 2 = 400 aliases at most today. 500 leaves headroom above that
 *  figure so warm-up never evicts a still-listed recipe under normal use.
 *  This is headroom against the current LIST bound, not a claim that the
 *  underlying recipe catalog is fixed in size — revisit this constant
 *  alongside `RECIPE_LIST_FIRST_PAGE_CEILING` if that bound changes. */
export const RECIPE_DETAIL_CACHE_CAPACITY = 500;

/** Normalise a slug/UUID lookup key so `Cucumber-Egg` and `cucumber-egg` hit. */
export function recipeDetailCacheKey(idOrSlug: string | null | undefined): string {
  return String(idOrSlug ?? '').trim().toLowerCase();
}

/**
 * Insertion-ordered `Map` used as an LRU: a `get`/`set` moves the key to the
 * newest position; once over capacity the oldest key is evicted. Two side maps
 * track alias grouping so a recipe can be invalidated under every key at once.
 */
class RecipeDetailCache {
  private readonly store = new Map<string, RecipeDetail>();
  /** canonical id key -> every alias key that currently resolves to that recipe. */
  private readonly aliasGroups = new Map<string, Set<string>>();
  /** alias key -> its canonical id key (reverse index for O(1) invalidation). */
  private readonly canonicalOf = new Map<string, string>();
  private readonly capacity: number;

  constructor(capacity: number = RECIPE_DETAIL_CACHE_CAPACITY) {
    this.capacity = capacity;
  }

  get(idOrSlug: string | null | undefined): RecipeDetail | undefined {
    const key = recipeDetailCacheKey(idOrSlug);
    if (key === '') return undefined;
    const hit = this.store.get(key);
    if (hit === undefined) return undefined;
    // Refresh recency.
    this.store.delete(key);
    this.store.set(key, hit);
    return hit;
  }

  has(idOrSlug: string | null | undefined): boolean {
    return this.store.has(recipeDetailCacheKey(idOrSlug));
  }

  /**
   * Store `detail` under the request key AND its resolved UUID `id`, so a later
   * navigation by either identifier is still a hit. Each alias counts as one
   * entry against the capacity, and both are recorded in one alias group so
   * `invalidate()` can drop the whole recipe at once.
   */
  set(idOrSlug: string | null | undefined, detail: RecipeDetail): void {
    const canonical =
      recipeDetailCacheKey(detail?.id) || recipeDetailCacheKey(idOrSlug);
    if (canonical === '') return; // nothing usable to key on

    const keys = new Set<string>();
    for (const candidate of [idOrSlug, detail?.id]) {
      const key = recipeDetailCacheKey(candidate);
      if (key !== '') keys.add(key);
    }

    for (const key of keys) {
      // If this key was previously an alias of a different recipe, detach it
      // from that group first so alias groups never overlap.
      const priorCanonical = this.canonicalOf.get(key);
      if (priorCanonical !== undefined && priorCanonical !== canonical) {
        this.detachFromGroup(priorCanonical, key);
      }
      this.store.delete(key);
      this.store.set(key, detail);
      this.canonicalOf.set(key, canonical);
      let group = this.aliasGroups.get(canonical);
      if (group === undefined) {
        group = new Set<string>();
        this.aliasGroups.set(canonical, group);
      }
      group.add(key);
    }
    this.evict();
  }

  /**
   * Remove a recipe and EVERY alias that resolves to it (request key + resolved
   * UUID), given any one of those keys. Used when an authoritative
   * `RecipeNotFoundError` proves a cached recipe is gone. Returns the number of
   * store entries actually dropped.
   */
  invalidate(idOrSlug: string | null | undefined): number {
    const key = recipeDetailCacheKey(idOrSlug);
    if (key === '') return 0;

    const canonical =
      this.canonicalOf.get(key) ?? (this.aliasGroups.has(key) ? key : undefined);

    let removed =
      canonical !== undefined ? this.dropCanonicalGroup(canonical) : 0;
    // Cover a bare, untracked key that somehow exists on its own.
    if (this.store.delete(key)) removed += 1;
    this.canonicalOf.delete(key);
    return removed;
  }

  /**
   * Drop a single recipe's entries. Back-compat wrapper over `invalidate` —
   * every identifier passed is resolved to its full alias group.
   */
  delete(idOrSlug: string | null | undefined, detail?: RecipeDetail): void {
    for (const candidate of [idOrSlug, detail?.id]) {
      this.invalidate(candidate);
    }
  }

  clear(): void {
    this.store.clear();
    this.aliasGroups.clear();
    this.canonicalOf.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private detachFromGroup(canonical: string, key: string): void {
    const group = this.aliasGroups.get(canonical);
    if (group === undefined) return;
    group.delete(key);
    if (group.size === 0) this.aliasGroups.delete(canonical);
  }

  /**
   * Drop one recipe's whole alias group — every tracked alias key plus all
   * reverse-index bookkeeping — in a single step. Returns the number of store
   * entries removed. Unrelated recipes are untouched.
   */
  private dropCanonicalGroup(canonical: string): number {
    const group = this.aliasGroups.get(canonical);
    if (group === undefined) return 0;
    let removed = 0;
    for (const member of group) {
      if (this.store.delete(member)) removed += 1;
      this.canonicalOf.delete(member);
    }
    this.aliasGroups.delete(canonical);
    return removed;
  }

  /**
   * LRU eviction is ATOMIC per recipe: when the oldest entry belongs to recipe
   * X, X's entire alias group (slug key AND resolved-UUID key) is evicted
   * together. This prevents a half-evicted recipe where one alias survives
   * untracked and can no longer be invalidated on an authoritative not-found.
   */
  private evict(): void {
    while (this.store.size > this.capacity) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      const canonical = this.canonicalOf.get(oldest) ?? oldest;
      const removed = this.dropCanonicalGroup(canonical);
      if (removed === 0) {
        // Untracked bare key — remove it directly so the loop can make progress.
        this.store.delete(oldest);
        this.canonicalOf.delete(oldest);
      }
    }
  }
}

/** Process-wide singleton used by `useRecipeDetail`. */
export const recipeDetailCache = new RecipeDetailCache();

/** Exposed for unit tests — construct an isolated instance. */
export { RecipeDetailCache };
