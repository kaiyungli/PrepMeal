export type Page = 'favorites' | 'recipes' | 'home';
export const STEPS = [
  { page: 'favorites', label: '首次測試收藏' },
  { page: 'recipes', label: '切換食譜' },
  { page: 'favorites', label: '返回收藏' },
  { page: 'home', label: '切換首頁' },
] as const;
type Outcome = 'ready' | 'error' | 'cancelled' | 'timeout' | 'hidden';
type Sample = { step: number; page: Page; outcome: Outcome; route_complete_ms?: number; data_ready_ms?: number; completed_api_resources?: number };
type Snapshot = { enabled: boolean; running: boolean; mode: 'desktop' | 'phone'; viewport: { width: number; height: number }; samples: Sample[] };
const IDLE: Snapshot = { enabled: false, running: false, mode: 'desktop', viewport: { width: 0, height: 0 }, samples: [] };
let snapshot = IDLE;
let scope: string | null = null; // Account/epoch guard stays in memory and is never exported.
let pending: { step: number; page: Page; start: number; route?: number; ready?: number; outcome?: 'ready' | 'error'; timer: ReturnType<typeof setTimeout> } | null = null;
const listeners = new Set<() => void>();
const round = (n: number) => Math.round(n * 100) / 100;
function publish(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch }; listeners.forEach(fn => fn());
}
export const subscribeNavigationMeasurement = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getNavigationMeasurement = () => snapshot;
export const getServerNavigationMeasurement = () => IDLE;
export const measurementScope = (userId: string, epoch = 0) => JSON.stringify([userId, epoch]);
export function startNavigationMeasurement(mode: 'desktop' | 'phone', accountScope: string) {
  clearNavigationMeasurement();
  if (typeof window === 'undefined') return;
  scope = accountScope;
  publish({ enabled: true, mode, viewport: { width: window.innerWidth, height: window.innerHeight }, samples: [] });
}
export function clearNavigationMeasurement() {
  if (pending) clearTimeout(pending.timer);
  pending = null; scope = null; snapshot = IDLE; listeners.forEach(fn => fn());
}
export function validateNavigationScope(accountScope: string | null) {
  if (snapshot.enabled && accountScope !== scope) clearNavigationMeasurement();
}
export function measurementPage(url: string): Page | null {
  // Accept only fixed app routes; never retain query strings or arbitrary URLs.
  const path = url.split(/[?#]/, 1)[0];
  return path === '/favorites' ? 'favorites' : path === '/recipes' ? 'recipes' : path === '/' ? 'home' : null;
}
function completedApiResources(start: number, end: number): number | undefined {
  try {
    return performance.getEntriesByType('resource').filter(entry => {
      const r = entry as PerformanceResourceTiming;
      if (r.responseEnd < start || r.responseEnd > end || r.responseEnd <= 0) return false;
      const url = new URL(r.name, window.location.origin);
      return url.origin === window.location.origin && url.pathname.startsWith('/api/');
    }).length;
  } catch { return undefined; }
}
function finish(outcome: Outcome) {
  if (!pending) return;
  const item = pending; pending = null; clearTimeout(item.timer);
  const count = completedApiResources(item.start, performance.now());
  const sample: Sample = { step: item.step, page: item.page, outcome };
  if (item.route !== undefined) sample.route_complete_ms = round(item.route - item.start);
  if (item.ready !== undefined) sample.data_ready_ms = round(item.ready - item.start);
  if (count !== undefined) sample.completed_api_resources = count;
  publish({ running: false, samples: [...snapshot.samples, sample] });
}
export function beginNavigationStep(): Page | null {
  if (!snapshot.enabled || pending || snapshot.samples.length >= STEPS.length) return null;
  const step = snapshot.samples.length;
  const page = STEPS[step].page;
  if (document.visibilityState === 'hidden') return null;
  pending = { step: step + 1, page, start: performance.now(), timer: setTimeout(() => finish('timeout'), 15_000) };
  publish({ running: true });
  return page;
}
export function navigationRouteStarted(url: string) {
  if (pending && measurementPage(url) !== pending.page) finish('cancelled');
}
export function navigationRouteCompleted(url: string) {
  if (!pending) return;
  if (measurementPage(url) !== pending.page) { finish('cancelled'); return; }
  pending.route = performance.now();
  if (pending.ready !== undefined) finish(pending.outcome || 'ready');
}
export function navigationDataReady(page: Page, outcome: 'ready' | 'error' = 'ready') {
  if (!pending || pending.page !== page || pending.ready !== undefined) return;
  pending.ready = performance.now(); pending.outcome = outcome;
  if (pending.route !== undefined) finish(outcome);
}
export function cancelNavigationStep(outcome: 'cancelled' | 'hidden' = 'cancelled') { finish(outcome); }
export function exportNavigationMeasurement() {
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  return { schema: 'prepmeal-navigation-measurement-v1', complete: snapshot.samples.length === STEPS.length && snapshot.samples.every(s => s.outcome === 'ready'),
    mode: snapshot.mode, viewport: { ...snapshot.viewport },
    ...(sha && /^[a-f0-9]{40}$/.test(sha) ? { build_commit: sha } : {}),
    note: 'Explicit SPA steps. First means first measured entry, not a cold cache. Data-ready marks settled list state, not paint or full-page readiness. Resource counts are completed same-origin API entries in the browser buffer during each step; may include prior requests and omit in-flight or evicted entries. No credentials, account IDs, URLs or recipe data.',
    samples: snapshot.samples.map(s => ({ ...s })) };
}
