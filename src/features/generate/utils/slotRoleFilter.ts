/**
 * Shared slot-role filtering for generate feature layer
 * 
 * Slot lookup for replace/add-random. Uses COMPOSITION_CONFIG for role
 * mapping and the shared planner rules for role matching.
 */
import { COMPOSITION_CONFIG } from '@/constants/composition';

/**
 * Get slot roles array for a composition mode
 */
export function getSlotRolesForComposition(composition: string): string[] {
  const config = COMPOSITION_CONFIG[composition as keyof typeof COMPOSITION_CONFIG];
  return config?.slotRoles || ['any'];
}

/**
 * Determine slot role by index
 */
export function getSlotRoleForIndex(composition: string, index: number): string {
  const roles = getSlotRolesForComposition(composition);
  return roles[index % roles.length] || 'any';
}

/**
 * The recipes in a day's other composition slots (excluding `index`), for the
 * one-complete-meal-per-day check. Slots beyond the composition are ignored.
 */
export function getOtherSlotsInDay<T>(
  weeklyPlan: Record<string, T[]>,
  dayKey: string,
  index: number,
  composition: string
): T[] {
  const slotCount = getSlotRolesForComposition(composition).length;
  return (weeklyPlan[dayKey] || []).slice(0, slotCount).filter((_, i) => i !== index);
}

// Role matching lives in one place for the planner and these local actions.
export { matchesSlotRole, allowsCrossRoleFallback, fitsDailyCompleteMealLimit, fitsCompleteMealSetting } from '@/lib/slotRoles';
