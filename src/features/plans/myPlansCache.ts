/**
 * In-memory cache for the "我的餐單" list.
 *
 * - Going back to /my-plans in the same tab shows the last list at once and
 *   refreshes it in the background.
 * - Hovering / touching the "我的餐單" link starts the request early.
 * - Saving or deleting a plan marks the cache stale, so the next visit
 *   always refreshes it.
 *
 * Memory only (never written to browser storage), and keyed by user id so
 * one account never sees another's plans.
 */

export type SavedPlanSummary = Record<string, unknown> & { id: string };

type Entry = {
  userId: string;
  plans: SavedPlanSummary[] | null;
  stale: boolean;
  pending: Promise<SavedPlanSummary[]> | null;
};

let entry: Entry | null = null;
// Bumped by invalidate/clear so a request that started earlier cannot write
// an older list back into the cache.
let generation = 0;

function entryFor(userId: string): Entry {
  if (!entry || entry.userId !== userId) {
    entry = { userId, plans: null, stale: true, pending: null };
  }
  return entry;
}

/** The cached list for this user, or null if none. */
export function peekMyPlans(userId: string | null | undefined): SavedPlanSummary[] | null {
  if (!userId || !entry || entry.userId !== userId) return null;
  return entry.plans;
}

/** Whether the cached list (if any) should be refreshed before it is trusted. */
export function isMyPlansStale(userId: string | null | undefined): boolean {
  if (!userId || !entry || entry.userId !== userId) return true;
  return entry.stale || entry.plans === null;
}

export async function fetchMyPlans(token: string): Promise<SavedPlanSummary[]> {
  const res = await fetch('/api/user/menus', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data?.success || !Array.isArray(data?.data?.plans)) {
    throw new Error('Invalid menus response');
  }
  return data.data.plans as SavedPlanSummary[];
}

/**
 * Load the list for this user, sharing one request between the page and a
 * prefetch that is already running.
 */
export function loadMyPlans(userId: string, token: string): Promise<SavedPlanSummary[]> {
  const current = entryFor(userId);
  if (current.pending) return current.pending;
  const startedAt = generation;
  const pending = fetchMyPlans(token)
    .then((plans) => {
      if (generation === startedAt && entry === current) {
        current.plans = plans;
        current.stale = false;
      }
      return plans;
    })
    .finally(() => {
      if (current.pending === pending) current.pending = null;
    });
  current.pending = pending;
  return pending;
}

/** Start loading early (link hover/touch). Errors are ignored; the page retries. */
export function prefetchMyPlans(userId: string, token: string): void {
  if (!isMyPlansStale(userId)) return;
  loadMyPlans(userId, token).catch(() => {});
}

/** Keep the cache in step with a list the page has changed (e.g. after delete). */
export function setMyPlans(userId: string, plans: SavedPlanSummary[]): void {
  const current = entryFor(userId);
  current.plans = plans;
}

/** Call after saving a plan: next visit refreshes the list. */
export function invalidateMyPlans(): void {
  generation++;
  if (entry) {
    entry.stale = true;
    entry.pending = null;
  }
}

/** Drop everything (e.g. on logout). */
export function clearMyPlans(): void {
  generation++;
  entry = null;
}
