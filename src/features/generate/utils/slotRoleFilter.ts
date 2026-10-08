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

// Role matching lives in one place for the planner and these local actions.
export { matchesSlotRole, allowsCrossRoleFallback } from '@/lib/slotRoles';
