// ============================================
// GENERATE FILTER ADAPTER
// Converts legacy generate preferences to new unified filter object
// ============================================

/**
 * Input shape - legacy generate preferences
 */
interface LegacyGenerateInput {
  cuisines?: string[];
  cookingConstraints?: string[];
  exclusions?: string[];
  dietMode?: string;
  pantryIngredients?: string[];
  ingredientReuse?: string;
  budget?: string;
  [key: string]: any;
}

/**
 * Output shape - unified filter object (8 groups)
 */
interface UnifiedFilters {
  cuisine: string[];
  protein: string[];
  method: string[];
  speed: string[];
  difficulty: string[];
  diet: string[];
  flavor: string[];
  dish_type: string[];
}

// Legacy values that map to speed
const SPEED_VALUES = ['quick', 'normal', 'under_15', 'under_30', 'under_45', 'under_60'];

// Legacy values that map to difficulty
const DIFFICULTY_VALUES = ['easy', 'medium', 'hard'];

// Legacy values that map to method
const METHOD_VALUES = ['stir_fry', 'steamed', 'fried', 'boiled', 'braised', 'baked', 'grilled', 'no_cook'];

// Legacy dietMode values that map to diet filter
const DIET_MODE_MAP: Record<string, string> = {
  'vegetarian': 'vegetarian',
  'high_protein': 'high_protein',
  'low_carb': 'low_calorie',
  'low_calorie': 'low_calorie',
  'keto': 'low_calorie',
  'general': '', // No filter for general
};

/**
 * Build unified filter object from legacy generate preferences
 * 
 * Key insight: NOT all legacy fields should map to filters:
 * - exclusions: NEGATIVE filter (avoid), protein filter is POSITIVE (include)
 * - pantryIngredients: Used for scoring, not filtering
 * - ingredientReuse: Planning preference, not filter
 * - budget: Legacy field, not in new filter system
 */
export function buildGenerateFiltersFromLegacy(input: LegacyGenerateInput): UnifiedFilters {
  const filters: UnifiedFilters = {
    cuisine: [],
    protein: [],
    method: [],
    speed: [],
    difficulty: [],
    diet: [],
    flavor: [],
    dish_type: [],
  };

  // 1. Map cuisines -> cuisine
  if (input.cuisines && Array.isArray(input.cuisines)) {
    filters.cuisine = input.cuisines.filter((c): c is string => typeof c === 'string');
  }

  // 2. Map cookingConstraints to speed/difficulty/method
  if (input.cookingConstraints && Array.isArray(input.cookingConstraints)) {
    for (const constraint of input.cookingConstraints) {
      if (SPEED_VALUES.includes(constraint)) {
        // Map time constraints to speed
        // 'under_15' -> 'quick', 'under_30'/'under_45'/'under_60' -> 'normal'
        if (constraint.startsWith('under_')) {
          const minutes = parseInt(constraint.replace('under_', ''), 10);
          if (minutes <= 15) {
            filters.speed.push('quick');
          } else {
            filters.speed.push('normal');
          }
        } else {
          filters.speed.push(constraint);
        }
      } else if (DIFFICULTY_VALUES.includes(constraint)) {
        filters.difficulty.push(constraint);
      } else if (METHOD_VALUES.includes(constraint)) {
        filters.method.push(constraint);
      }
    }
  }

  // 3. Map dietMode -> diet
  // NOTE: dietMode like 'vegetarian' maps directly to diet filter
  if (input.dietMode && input.dietMode !== 'general') {
    const mappedDiet = DIET_MODE_MAP[input.dietMode];
    if (mappedDiet) {
      filters.diet.push(mappedDiet);
    }
  }

  // 4. DO NOT map exclusions to protein filter
  // Exclusions = "avoid these proteins" (NEGATIVE)
  // Protein filter = "only these proteins" (POSITIVE)
  // These are semantically opposite - cannot simply map

  return filters;
}

/**
 * Helper to check if any filters are active
 */
export function hasActiveFilters(filters: UnifiedFilters): boolean {
  return Object.values(filters).some(arr => arr.length > 0);
}