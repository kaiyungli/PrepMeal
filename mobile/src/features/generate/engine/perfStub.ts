/**
 * No-op performance-instrumentation stub for the vendored planner engine.
 *
 * The web planner (`src/lib/mealPlanner.ts`) imports `perfNow` / `perfMeasure` /
 * `perfLog` from `@/utils/perf`. That web module reaches for `window`,
 * `PerformanceObserver` and `process.env.NEXT_PUBLIC_*`, and every call it makes
 * is a documented no-op unless `window` exists AND `NEXT_PUBLIC_ENABLE_PERF ===
 * 'true'` — i.e. it never does anything in production or in React Native.
 *
 * This stub is the ONLY code change permitted when vendoring `mealPlanner.ts`
 * into the mobile app (see `provenance.json`): the planner's behaviour is
 * byte-for-byte the web algorithm, minus dead instrumentation. Keep these
 * signatures loose and side-effect-free.
 */

export function perfNow(): number {
  return 0;
}

export function perfLog(_params?: unknown): void {
  /* no-op */
}

export function perfMeasure(_label?: string, _start?: number): void {
  /* no-op */
}
