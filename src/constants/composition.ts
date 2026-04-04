/**
 * Composition configuration - single source of truth for meal composition modes
 * Used by both generate.js (UI) and mealPlanner.ts (scoring)
 */

export const COMPOSITION_CONFIG = {
  complete_meal: {
    dishesPerDay: 1,
    slotRoles: ['complete_meal'],
    completeMealPenalty: 0, // No penalty in complete_meal mode
  },
  meat_veg: {
    dishesPerDay: 2,
    slotRoles: ['protein_main', 'veg_side'],
    completeMealPenalty: -3, // Further tuned in 1-meat-1-veg mode
  },
  two_meat_one_veg: {
    dishesPerDay: 3,
    slotRoles: ['protein_main', 'protein_main', 'veg_side'],
    completeMealPenalty: -4.5, // Further tuned in 2-meat-1-veg mode
  },
};

// Type for the config values
export type CompositionMode = keyof typeof COMPOSITION_CONFIG;

export const DEFAULT_COMPOSITION: CompositionMode = 'meat_veg';

// Helper to get config safely
export function getCompositionConfig(mode: string) {
  return COMPOSITION_CONFIG[mode as CompositionMode] || COMPOSITION_CONFIG[DEFAULT_COMPOSITION];
}