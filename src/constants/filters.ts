// ============================================
// UNIFIED FILTER SYSTEM - Single Source of Truth
// ============================================
// Only 8 filter groups for recipe filtering:
// cuisine, dish_type, protein, method, speed, difficulty, diet, flavor
// NO budget filter

// ============================================
// IMPORTS FROM CENTRALIZED CONSTANTS
// ============================================
import { 
  CUISINE_OPTIONS, 
  DISH_TYPE_OPTIONS, 
  PROTEIN_OPTIONS, 
  METHOD_OPTIONS, 
  SPEED_OPTIONS, 
  DIFFICULTY_OPTIONS, 
  DIET_OPTIONS, 
  FLAVOR_OPTIONS,
  CUISINE_MAP,
  DISH_TYPE_MAP,
  PROTEIN_MAP,
  METHOD_MAP,
  SPEED_MAP,
  DIFFICULTY_MAP,
  DIET_MAP,
  FLAVOR_MAP,
  getLabel as getLabelTaxonomy,
} from './taxonomy';

import { RECIPE_FILTER_GROUPS } from './filterGroups';

// ============================================
// RE-EXPORT OPTIONS FOR BACKWARD COMPATIBILITY
// ============================================
export { 
  CUISINE_OPTIONS, 
  DISH_TYPE_OPTIONS, 
  PROTEIN_OPTIONS, 
  METHOD_OPTIONS, 
  SPEED_OPTIONS, 
  DIFFICULTY_OPTIONS, 
  DIET_OPTIONS, 
  FLAVOR_OPTIONS,
  CUISINE_MAP,
  DISH_TYPE_MAP,
  PROTEIN_MAP,
  METHOD_MAP,
  SPEED_MAP,
  DIFFICULTY_MAP,
  DIET_MAP,
  FLAVOR_MAP,
  getLabel as getLabelTaxonomy,
} from './taxonomy';

// ============================================
// FILTER GROUPS - Unified for all pages
// ============================================
// Now points to centralized RECIPE_FILTER_GROUPS
export const FILTER_GROUPS = RECIPE_FILTER_GROUPS;

// ============================================
// DATA COMPATIBILITY HELPERS
// ============================================

/**
 * Get effective protein array for filtering
 * Falls back to primary_protein if protein[] is empty
 */
export function getEffectiveProtein(recipe: any): string[] {
  if (recipe.protein && Array.isArray(recipe.protein) && recipe.protein.length > 0) {
    return recipe.protein;
  }
  // Fallback to primary_protein
  if (recipe.primary_protein) {
    return [recipe.primary_protein];
  }
  return [];
}

/**
 * Get effective diet array for filtering
 * Returns empty array if null/undefined
 */
export function getEffectiveDiet(recipe: any): string[] {
  if (recipe.diet && Array.isArray(recipe.diet)) {
    return recipe.diet;
  }
  return [];
}

/**
 * Get effective flavor array for filtering
 * Returns empty array if null/undefined
 */
export function getEffectiveFlavor(recipe: any): string[] {
  // Import FLAVOR_MAP for normalization
  const flavorMap: Record<string, string> = (require("./taxonomy") as any).FLAVOR_MAP || {
    salty: "鹹", sweet: "甜", sour: "酸", spicy: "辣",
    鹹: "鹹", 甜: "甜", 酸: "酸", 辣: "辣",
    savory: "鹹", umami: "鹹", tangy: "酸", garlicky: "鹹",
    creamy: "甜", buttery: "甜", sesame: "鹹", peppery: "辣",
  };
  
  const extractCanonical = (val: string): string => {
    if (!val) return "";
    const lower = val.toLowerCase().trim();
    const mapped = flavorMap[lower] || flavorMap[val] || val;
    // Return canonical English key
    if (mapped === "鹹") return "salty";
    if (mapped === "甜") return "sweet";
    if (mapped === "酸") return "sour";
    if (mapped === "辣") return "spicy";
    return "";
  };
  
  // Handle different input types
  let flavors: string[] = [];
  
  if (!recipe?.flavor) {
    return [];
  }
  
  // String input (comma-separated or single)
  if (typeof recipe.flavor === "string") {
    const str = recipe.flavor as string;
    if (str.includes(",")) {
      flavors = str.split(",").map(s => s.trim());
    } else {
      flavors = [str.trim()];
    }
  } 
  // Array input
  else if (Array.isArray(recipe.flavor)) {
    flavors = [...recipe.flavor];
  }
  // Fallback
  else {
    return [];
  }
  
  // Normalize each flavor value
  const canonicalFlavors = flavors
    .map(f => extractCanonical(f))
    .filter(Boolean);
  
  // Return unique canonical flavors only
  return [...new Set(canonicalFlavors)];
}

/**
 * Normalize recipe for filter matching
 * Consolidates all compatibility logic in one place
 */
export function normalizeRecipeForFilter(recipe: any) {
  return {
    ...recipe,
    _effectiveProtein: getEffectiveProtein(recipe),
    _effectiveDiet: getEffectiveDiet(recipe),
    _effectiveFlavor: getEffectiveFlavor(recipe),
  };
}

// ============================================
// FILTER MATCHING LOGIC
// ============================================

/**
 * Check if recipe matches selected filters
 * - Same group: OR logic (e.g., chinese OR japanese)
 * - Different groups: AND logic
 * - Empty selection: no filter applied
 */
export function recipeMatchesFilters(recipe: any, filters: Record<string, string[]>): boolean {
  const normalized = normalizeRecipeForFilter(recipe);
  
  for (const [groupKey, selectedValues] of Object.entries(filters)) {
    if (!selectedValues || selectedValues.length === 0) {
      continue; // No filter for this group
    }
    
    let matches = false;
    
    switch (groupKey) {
      case 'cuisine':
        matches = selectedValues.includes(normalized.cuisine);
        break;
      case 'dish_type':
        matches = selectedValues.includes(normalized.dish_type);
        break;
      case 'protein':
        // Array intersection - recipe.protein[] contains any selected
        matches = normalized._effectiveProtein.some((p: string) => selectedValues.includes(p));
        break;
      case 'method':
        matches = selectedValues.includes(normalized.method);
        break;
      case 'speed':
        matches = selectedValues.includes(normalized.speed);
        break;
      case 'difficulty':
        matches = selectedValues.includes(normalized.difficulty);
        break;
      case 'diet':
        // Array intersection - recipe.diet[] contains any selected
        matches = normalized._effectiveDiet.some((d: string) => selectedValues.includes(d));
        break;
      case 'flavor':
        // Array intersection - recipe.flavor[] contains any selected
        matches = normalized._effectiveFlavor.some((f: string) => selectedValues.includes(f));
        break;
    }
    
    if (!matches) {
      return false; // Different groups: AND - one fail = overall fail
    }
  }
  
  return true;
}

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================
// Keep these for any legacy code that might reference them
export const CUISINES = CUISINE_OPTIONS;
export const DISH_TYPE = DISH_TYPE_OPTIONS;
export const PROTEIN_TYPES = PROTEIN_OPTIONS;
export const COOKING_METHODS = METHOD_OPTIONS;
export const TIME_OPTIONS = SPEED_OPTIONS;
export const TIME_VALUES = SPEED_OPTIONS;
export const DIET_MODES = DIET_OPTIONS;
export const DIET_VALUES = DIET_OPTIONS;
export const FLAVOR = FLAVOR_OPTIONS;

// Legacy generation constraints
export const GENERATE_TIME_CONSTRAINTS = SPEED_OPTIONS;
export const GENERATE_DIFFICULTY_CONSTRAINTS = DIFFICULTY_OPTIONS;
export const GENERATE_EQUIPMENT_CONSTRAINTS = [];
export const COOKING_CONSTRAINTS = [];
export const EXCLUSIONS = [];
export const BUDGET_OPTIONS = [];

// ============================================
// UNUSED LEGACY - KEPT FOR COMPATIBILITY
// ============================================
export const INGREDIENT_REUSE = [{ value: 'allow', label: '允許' }, { value: 'avoid', label: '避免' }];
