/**
 * Hook for generate page preferences and filters
 * 
 * Architecture:
 * - Planning settings (daysPerWeek, servings, etc.) are separate
 * - Unified filters are the real source of truth for filter state
 * - setFilters directly updates filters state (no legacy mapping)
 * - Legacy fields (cuisines, cookingConstraints, dietMode) are derived from filters for server-side API params
 */
import { useState, useCallback, useMemo } from 'react';

// Unified filter state type
const INITIAL_FILTERS = {
  cuisine: [],
  dish_type: [],
  protein: [],
  method: [],
  speed: [],
  difficulty: [],
  diet: [],
  flavor: []
};

export function useGeneratePreferences() {
  // === Unified Filters State (Source of Truth) ===
  const [filters, setFiltersState] = useState(INITIAL_FILTERS);

  // === Planning Settings ===
  const [daysPerWeek, setDaysPerWeek] = useState(7);
  const [dishesPerDay, setDishesPerDay] = useState(2); // Legacy - prefer dailyComposition
  const [dailyComposition, setDailyComposition] = useState('complete_meal');
  const [allowCompleteMeal, setAllowCompleteMeal] = useState(true);
  const [servings, setServings] = useState(2);
  
  // === Preference Settings ===
  const [budget, setBudget] = useState('normal');
  const [ingredientReuse, setIngredientReuse] = useState('normal');
  const [exclusions, setExclusions] = useState([]);  // Separate: avoid vs include

  // === Legacy-derived state for server-side API params ===
  // Derive cuisines from filters.cuisine
  const cuisines = filters.cuisine;
  const setCuisines = useCallback((values) => {
    setFiltersState(prev => ({ ...prev, cuisine: Array.isArray(values) ? values : [] }));
  }, []);

  // Derive cookingConstraints from filters.difficulty + filters.method + filters.speed
  const cookingConstraints = useMemo(() => {
    const constraints = [];
    if (filters.difficulty) constraints.push(...filters.difficulty);
    if (filters.method) constraints.push(...filters.method);
    // Convert speed to legacy format
    if (filters.speed) {
      for (const speed of filters.speed) {
        if (speed === 'quick') constraints.push('under_15');
        else if (speed === 'normal') constraints.push('under_60');
        else constraints.push(speed); // passthrough for explicit time values
      }
    }
    return constraints;
  }, [filters.difficulty, filters.method, filters.speed]);

  // Derive dietMode from filters.diet (first value or 'general')
  const dietMode = filters.diet.length > 0 ? filters.diet[0] : 'general';

  // === Filter Toggle Handlers ===
  const toggleFilter = useCallback((groupKey, value) => {
    setFiltersState(prev => {
      const current = prev[groupKey] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [groupKey]: next };
    });
  }, []);

  // Convenience aliases for backward compatibility
  const toggleCuisine = useCallback((value) => toggleFilter('cuisine', value), [toggleFilter]);
  const toggleConstraint = useCallback((value) => {
    // Map to appropriate filter group based on value type
    const DIFFICULTY_VALUES = ['easy', 'medium', 'hard'];
    const METHOD_VALUES = ['stir_fry', 'steamed', 'fried', 'boiled', 'braised', 'baked', 'grilled', 'no_cook'];
    const SPEED_VALUES = ['quick', 'normal', 'under_15', 'under_30', 'under_45', 'under_60'];
    
    if (DIFFICULTY_VALUES.includes(value)) {
      toggleFilter('difficulty', value);
    } else if (METHOD_VALUES.includes(value)) {
      toggleFilter('method', value);
    } else if (SPEED_VALUES.includes(value)) {
      // Convert legacy speed value
      if (value === 'under_15') toggleFilter('speed', 'quick');
      else if (value === 'under_60') toggleFilter('speed', 'normal');
      else toggleFilter('speed', value);
    }
  }, [toggleFilter]);

  const toggleExclusion = useCallback((value) => {
    setExclusions(prev => 
      prev.includes(value) 
        ? prev.filter(e => e !== value)
        : [...prev, value]
    );
  }, []);

  // === Clear All Filters ===
  const clearFilters = useCallback(() => {
    setFiltersState(INITIAL_FILTERS);
  }, []);

  // === Set Filters (Direct Update) ===
  // This directly updates the unified filters state
  // All filter groups are preserved (no selective mapping)
  const setFilters = useCallback((nextFilters) => {
    if (typeof nextFilters === 'function') {
      setFiltersState(prev => nextFilters(prev));
    } else {
      setFiltersState(nextFilters);
    }
  }, []);

  return {
    // Planning settings
    daysPerWeek, setDaysPerWeek,
    dishesPerDay, setDishesPerDay, // Legacy - prefer dailyComposition
    dailyComposition, setDailyComposition,
    allowCompleteMeal, setAllowCompleteMeal,
    servings, setServings,
    
    // Preference settings
    budget, setBudget,
    ingredientReuse, setIngredientReuse,
    exclusions, setExclusions,
    
    // Filter state
    cuisines, setCuisines,
    cookingConstraints,
    dietMode,
    
    // Handlers
    toggleExclusion,
    toggleCuisine,
    toggleConstraint,
    toggleFilter,
    clearFilters,
    
    // Unified filters (source of truth)
    filters,
    setFilters,
  };
}