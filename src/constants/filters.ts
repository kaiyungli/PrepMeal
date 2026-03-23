// ============================================
// UNIFIED FILTER SYSTEM - Single Source of Truth
// ============================================
// Only 8 filter groups for recipe filtering:
// cuisine, dish_type, protein, method, speed, difficulty, diet, flavor
// NO budget filter

// ============================================
// 1. CUISINE
// ============================================
export const CUISINE_OPTIONS = [
  { value: 'chinese', label: '中式' },
  { value: 'western', label: '西式' },
  { value: 'japanese', label: '日式' },
  { value: 'korean', label: '韓式' },
  { value: 'thai', label: '泰式' },
  { value: 'fusion', label: 'Fusion' },
];

// ============================================
// 2. DISH_TYPE
// ============================================
export const DISH_TYPE_OPTIONS = [
  { value: 'main', label: '主菜' },
  { value: 'side', label: '配菜' },
  { value: 'staple', label: '主食' },
  { value: 'soup', label: '湯' },
];

// ============================================
// 3. PROTEIN
// ============================================
export const PROTEIN_OPTIONS = [
  { value: 'chicken', label: '雞' },
  { value: 'pork', label: '豬' },
  { value: 'beef', label: '牛' },
  { value: 'egg', label: '蛋' },
  { value: 'tofu', label: '豆腐' },
  { value: 'shrimp', label: '蝦' },
  { value: 'fish', label: '魚' },
  { value: 'mixed', label: '混合蛋白' },
];

// ============================================
// 4. METHOD
// ============================================
export const METHOD_OPTIONS = [
  { value: 'stir_fry', label: '炒' },
  { value: 'steamed', label: '蒸' },
  { value: 'fried', label: '煎' },
  { value: 'boiled', label: '煮' },
  { value: 'braised', label: '燜' },
  { value: 'baked', label: '焗' },
];

// ============================================
// 5. SPEED
// ============================================
export const SPEED_OPTIONS = [
  { value: 'quick', label: '快手' },
  { value: 'normal', label: '一般' },
];

// ============================================
// 6. DIFFICULTY
// ============================================
export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '容易' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '進階' },
];

// ============================================
// 7. DIET
// ============================================
export const DIET_OPTIONS = [
  { value: 'vegetarian', label: '素食' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_calorie', label: '低卡' },
];

// ============================================
// 8. FLAVOR
// ============================================
export const FLAVOR_OPTIONS = [
  { value: 'salty', label: '鹹' },
  { value: 'sweet', label: '甜' },
  { value: 'sour', label: '酸' },
  { value: 'spicy', label: '辣' },
];

// ============================================
// FILTER GROUPS - Unified for all pages
// ============================================
export const FILTER_GROUPS = [
  { key: 'cuisine', label: '菜系', options: CUISINE_OPTIONS },
  { key: 'dish_type', label: '類型', options: DISH_TYPE_OPTIONS },
  { key: 'protein', label: '主要蛋白', options: PROTEIN_OPTIONS },
  { key: 'method', label: '烹調方式', options: METHOD_OPTIONS },
  { key: 'speed', label: '所需時間', options: SPEED_OPTIONS },
  { key: 'difficulty', label: '難度', options: DIFFICULTY_OPTIONS },
  { key: 'diet', label: '飲食需求', options: DIET_OPTIONS },
  { key: 'flavor', label: '口味', options: FLAVOR_OPTIONS },
];

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
  if (recipe.flavor && Array.isArray(recipe.flavor)) {
    return recipe.flavor;
  }
  return [];
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
export const TIME_OPTIONS = SPEED_OPTIONS; // Legacy alias
export const TIME_VALUES = SPEED_OPTIONS;
export const DIET_MODES = DIET_OPTIONS;
export const DIET_VALUES = DIET_OPTIONS;
export const FLAVOR = FLAVOR_OPTIONS;

// Legacy - but marked as not for UI
export const GENERATE_TIME_CONSTRAINTS = SPEED_OPTIONS;
export const GENERATE_DIFFICULTY_CONSTRAINTS = DIFFICULTY_OPTIONS;
export const GENERATE_EQUIPMENT_CONSTRAINTS = []; // No longer used in UI
export const COOKING_CONSTRAINTS = []; // Legacy - DO NOT USE
export const EXCLUSIONS = []; // Legacy - DO NOT USE
export const BUDGET_OPTIONS = []; // Legacy - NOT USED
export const INGREDIENT_REUSE = [{ value: 'allow', label: '允許' }, { value: 'avoid', label: '避免' }];


// ============================================
// UNIFIED FILTER BUILDER
// ============================================

import type { FilterSectionConfig } from '@/components/filters/FilterCardShell';

/**
 * Build filter sections for any page
 * All pages use the same 8 groups
 */
export function buildFilterSections(): FilterSectionConfig[] {
  return FILTER_GROUPS.map(group => ({
    id: group.key,
    title: group.label,
    options: group.options,
    selected: [],
    onToggle: () => {}, // Placeholder - will be overridden by caller
  }));
}
