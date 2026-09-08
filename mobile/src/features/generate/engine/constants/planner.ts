// ============================================
// PLANNER CONSTANTS - Meal Planner Scoring Weights
// ============================================
// Extracted scoring constants from mealPlanner.ts

// ============================================
// WEIGHTS - Score values for recipe selection
// ============================================
export const PLANNER_WEIGHTS = {
  // --- Base ---
  BASE_SCORE: 5,
  RANDOM_FACTOR: 0.2,

  // --- Repeat Penalty ---
  REPEAT_PENALTY: -3,

  // --- Protein Diversity ---
  PROTEIN_SAME_DAY: -2,
  PROTEIN_WITHIN_2_DAYS: -1,
  PROTEIN_NEW: 2,

  // --- Method Diversity ---
  METHOD_SAME_DAY: -1,
  METHOD_NEW: 1,

  // --- Pantry Bonus (uses normalized ingredients) ---
  PANTRY_MATCH: 12,

  // --- Speed Bias (weekday) ---
  SPEED_QUICK: 1,
  SPEED_NORMAL: 0.5,
  SPEED_SLOW: -1,

  // --- Difficulty Bias ---
  DIFFICULTY_EASY: 1,
  DIFFICULTY_MEDIUM: 0,
  DIFFICULTY_HARD: -0.5,

  // --- Variety Bonus ---
  VARIETY_NEW_CUISINE: 0.5,

  // --- Missing Penalty ---
  MISSING_PENALTY: 0.1,
};

// ============================================
// RULES - Configuration for lookback windows
// ============================================
export const PLANNER_RULES = {
  // Lookback window for protein diversity check
  // Current: checks same day, within 2 days
  PROTEIN_LOOKBACK: {
    SAME_DAY: 1,
    WITHIN_2_DAYS: 2,
  },

  // Lookback window for method diversity check
  // Current: checks same day only
  METHOD_LOOKBACK: {
    SAME_DAY: 1,
  },

  // Pantry weight by meal slot timing
  // Current: full weight early, half weight mid, none late
  PANTRY_BY_SLOT: {
    EARLY_FULL_WEIGHT_UNTIL: 3,   // Mon-Wed: full weight (12 points)
    MID_HALF_WEIGHT_UNTIL: 5,    // Thu-Fri: half weight (6 points)
    // After: no weight
  },

  // Maximum recipes to consider for scoring
  MAX_CANDIDATES: 50,

  // Days per week options
  DAYS_OPTIONS: [3, 5, 7],

  // Dishes per day options
  DISHES_OPTIONS: [1, 2, 3],
};
