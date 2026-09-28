/**
 * Module-lifetime, in-memory cache for the homepage's weekly plan selection.
 *
 * Scope, by design:
 * - Survives a React unmount + remount of the page component within the same
 *   already-loaded SPA session (Next.js Pages Router unmounts/remounts the
 *   page component on every client-side route change, but does not re-execute
 *   this module - so a plain module-scope variable naturally persists across
 *   "/ -> /recipes -> /" navigation).
 * - Does NOT survive a full browser reload or a new tab: those re-execute
 *   this module from scratch, resetting the cache to empty. No
 *   sessionStorage/localStorage is used anywhere here - that is intentional,
 *   not an oversight.
 *
 * Only recipe identity/order is cached (id + day/slot position), never a
 * snapshotted display object - the plan is always re-hydrated against
 * whichever `planRecipes` array is current at read time, so a recipe's
 * name/image can never go stale, and a since-removed id safely falls back to
 * a full regeneration instead of a partial/invalid plan.
 *
 * All reads/writes here must only ever be called from client-only lifecycle
 * code (a useEffect body or an event handler) - never from a component's
 * render body - so this module is never touched during SSR/static
 * generation, where module state could otherwise leak across requests.
 */
import { generateWeeklyPlan, type PlanDay, type PlanItem, type Recipe } from '@/services/weeklyPlan';

// PlanItem.recipeId is typed as `string | number | null` in weeklyPlan.ts,
// but generateWeeklyPlan()'s actual (current) implementation can never
// produce a null recipeId: when the recipe pool runs out for a slot, the
// loop's `if (idx < selectedRecipes.length)` guard skips pushing an item
// entirely for that slot rather than pushing a `{ recipeId: null, ... }`
// placeholder - a day simply ends up with fewer items than itemsPerDay. This
// is verified directly against the real (unmocked) generateWeeklyPlan() in
// tests/homeWeeklyPlanStability.test.ts.
//
// The cache only ever stores plans that came from generateWeeklyPlan(), so
// CachedSlot intentionally narrows recipeId to non-null - there is nothing
// legitimate to preserve on remount for a slot that was never generated in
// the first place; a day with fewer cached items behaves exactly like a day
// generateWeeklyPlan() itself produced with fewer items.
interface CachedSlot {
  recipeId: string | number;
  mealSlot: string;
  servings: number;
  done: boolean;
}

interface CachedDay {
  dayIndex: number;
  dayName: string;
  date: string | null;
  items: CachedSlot[];
}

let cachedSelection: CachedDay[] | null = null;

function hasRecipeId(item: PlanItem): item is PlanItem & { recipeId: string | number } {
  return item.recipeId != null;
}

function toSelection(plan: PlanDay[]): CachedDay[] {
  return plan.map(day => ({
    dayIndex: day.dayIndex,
    dayName: day.dayName,
    date: day.date,
    // Defensive only: PlanItem's wider type (from weeklyPlan.ts, which is
    // out of scope to change here) still technically allows a null
    // recipeId even though the real generator never produces one today. If
    // it ever did, dropping that slot here is the correct behavior - it
    // becomes indistinguishable from "no item was generated for this slot",
    // which is exactly how the rest of the system already represents that
    // case (see the comment above). This must never silently pass a null
    // through into the narrower CachedSlot type.
    items: day.items.filter(hasRecipeId).map(item => ({
      recipeId: item.recipeId,
      mealSlot: item.mealSlot,
      servings: item.servings,
      done: item.done,
    })),
  }));
}

/** Re-derives display data (name/image) from the current recipe pool. Returns
 * null - never a partial result - if any cached id can't be resolved, so the
 * caller can fall back to a full regeneration instead of showing broken
 * entries for recipes that were removed/unpublished since the plan was cached. */
function hydrate(selection: CachedDay[], planRecipes: Recipe[]): PlanDay[] | null {
  const byId = new Map(planRecipes.map(r => [String(r.id), r]));
  const days: PlanDay[] = [];
  for (const day of selection) {
    const items = [];
    for (const slot of day.items) {
      const recipe = byId.get(String(slot.recipeId));
      if (!recipe) return null;
      items.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeImage: recipe.image_url || null,
        servings: slot.servings,
        mealSlot: slot.mealSlot,
        done: slot.done,
      });
    }
    days.push({ dayIndex: day.dayIndex, dayName: day.dayName, date: day.date, items });
  }
  return days;
}

/** Returns the cached plan (re-hydrated against `planRecipes`) if one exists
 * and every cached id still resolves; otherwise generates a fresh plan and
 * caches its selection. Client-only - call from a useEffect, never render. */
export function getOrCreateWeeklyPlan(planRecipes: Recipe[]): PlanDay[] {
  if (cachedSelection) {
    const hydrated = hydrate(cachedSelection, planRecipes);
    if (hydrated) return hydrated;
    // A cached id no longer resolves (e.g. the recipe was removed) - discard
    // the stale selection and fall through to a full regeneration below.
    cachedSelection = null;
  }
  const fresh = generateWeeklyPlan(planRecipes);
  cachedSelection = toSelection(fresh);
  // Return what was just cached, re-hydrated, rather than `fresh` directly -
  // this guarantees the first-mount result is always byte-for-byte what a
  // remount would reconstruct from the cache (e.g. any slot toSelection()
  // would drop is dropped here too, on first mount, not just after
  // navigating away and back). Every id in cachedSelection was just read off
  // planRecipes above, so this can never fail to resolve.
  return hydrate(cachedSelection, planRecipes) ?? fresh;
}

/** Always generates a new plan, bypassing any cached selection, and replaces
 * the cache with the new result. Client-only - call from an event handler. */
export function refreshWeeklyPlan(planRecipes: Recipe[]): PlanDay[] {
  const fresh = generateWeeklyPlan(planRecipes);
  cachedSelection = toSelection(fresh);
  // Same reasoning as getOrCreateWeeklyPlan(): return the re-hydrated cache,
  // not `fresh` directly, so what's shown immediately after a manual refresh
  // always matches what a subsequent remount would reconstruct.
  return hydrate(cachedSelection, planRecipes) ?? fresh;
}
