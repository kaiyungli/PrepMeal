/**
 * Pure rules for the two Generate-preview settings (days, composition).
 *
 * The settings row is rendered ABOVE the generated plan. If a setting changes
 * while a plan is on screen (or a run is scheduled), the plan no longer matches
 * the settings shown next to it — so any real change must invalidate it: cancel
 * the scheduled run, drop the plan, return to `idle`. This module is the single
 * place that decides "did the settings actually change", so `useGeneratePlan`
 * and its tests agree.
 */
import type { CompositionMode, DaysPerWeek } from '../types.ts';

export interface GenerateSettingsSnapshot {
  days: DaysPerWeek;
  composition: CompositionMode;
}

/**
 * `true` when `next` differs from `prev` in days or composition — i.e. when a
 * displayed/scheduled plan is now stale and must be invalidated. A no-op
 * re-selection of the current value returns `false` (nothing to invalidate).
 */
export function generateSettingsChanged(
  prev: GenerateSettingsSnapshot,
  next: GenerateSettingsSnapshot,
): boolean {
  return prev.days !== next.days || prev.composition !== next.composition;
}
