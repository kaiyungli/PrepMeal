// ============================================
// PLANNER SCORING CONFIGURATION
// All tunable values for the meal planner algorithm
// ============================================

export const PLANNER_CONFIG = {
  // How many days to look back for protein diversity
  PROTEIN_LOOKBACK_DAYS: 2,
  
  // How many days to look back for method diversity
  METHOD_LOOKBACK_DAYS: 1,
  
  // Whether to allow recipe repetition within the week
  // Set to true for small databases
  RECIPE_REPEAT_ALLOWED: false,
  
  // Minimum recipes needed per week to avoid repetition
  MIN_RECIPES_FOR_NO_REPEAT: 14, // daysPerWeek * dishesPerDay * 2
  
  // Days before controlled repetition is allowed in small DBs
  DAYS_BEFORE_REPETITION: 3,
  
  // Enable debug logging
  DEBUG_MODE: false,
};

// ============================================
// SCORING BONUSES
// ============================================

export const SCORING_BONUS = {
  // Protein diversity bonus (when protein not used recently)
  PROTEIN_DIVERSITY: 2,
  
  // Method variety bonus (when method differs from recent)
  METHOD_VARIETY: 1,
  
  // Speed: quick on weekday
  SPEED_QUICK: 1,
  
  // Speed: normal on weekday  
  SPEED_NORMAL: 0.5,
  
  // Difficulty: easy on weekday
  DIFFICULTY_EASY: 1,
  
  // Budget: low budget matches low mode
  BUDGET_LOW_MATCH: 1,
  
  // Budget: medium budget matches medium mode
  BUDGET_MEDIUM_MATCH: 0.5,
  
  // Variety bonus for having diverse proteins
  VARIETY_BONUS: 0.5,
};

// ============================================
// SCORING PENALTIES
// ============================================

export const SCORING_PENALTY = {
  // Same protein as yesterday
  PROTEIN_SAME: -1,
  
  // Same method as yesterday
  METHOD_SAME: -1,
  
  // Slow speed on weekday
  SPEED_SLOW: -2,
  
  // Hard difficulty on weekday
  DIFFICULTY_HARD: -0.5,
  
  // Expensive recipe when in budget mode
  BUDGET_EXPENSIVE: -0.5,
};
