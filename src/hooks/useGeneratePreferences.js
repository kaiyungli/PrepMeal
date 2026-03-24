/**
 * Hook for generate page preferences and filters
 * 
 * @deprecated This hook maintains legacy state for backward compatibility with generate.js.
 * The UI now uses FILTER_GROUPS from @/constants/filters, but the state is still passed
 * through this hook for server-side filtering via API params.
 * 
 * TODO: Refactor generate.js to use unified filter state from useRecipeFilters
 * and pass to server via the same recipeMatchesFilters-compatible params.
 */
import { useState, useCallback, useMemo } from 'react';
import { buildGenerateFiltersFromLegacy } from '@/utils/generateFilterAdapter';

export function useGeneratePreferences() {
  // Planning settings
  const [daysPerWeek, setDaysPerWeek] = useState(7);
  const [dishesPerDay, setDishesPerDay] = useState(1);
  const [servings, setServings] = useState(2);
  
  // Preference settings  
  const [dietMode, setDietMode] = useState('general');
  const [budget, setBudget] = useState('normal');
  const [ingredientReuse, setIngredientReuse] = useState('normal');
  
  // Legacy filter state - kept for server-side API filtering
  // These map to the new FILTER_GROUPS concepts:
  // - cuisines -> cuisine filter (FILTER_GROUPS[0])
  // - cookingConstraints -> difficulty + method + speed filters (FILTER_GROUPS[4,5,6])
  // - exclusions -> protein filter (FILTER_GROUPS[2]) - for allergy exclusions
  const [exclusions, setExclusions] = useState([]);  // Maps to protein filter
  const [cuisines, setCuisines] = useState([]);       // Maps to cuisine filter
  const [cookingConstraints, setCookingConstraints] = useState([]); // Maps to difficulty/method/speed

  // Toggle handlers
  const toggleExclusion = useCallback((value) => {
    setExclusions(prev => 
      prev.includes(value) 
        ? prev.filter(e => e !== value)
        : [...prev, value]
    );
  }, []);

  const toggleCuisine = useCallback((value) => {
    setCuisines(prev => 
      prev.includes(value) 
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  }, []);

  const toggleConstraint = useCallback((value) => {
    setCookingConstraints(prev => 
      prev.includes(value) 
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setExclusions([]);
    setCuisines([]);
    setCookingConstraints([]);
  }, []);

  // Derived unified filters - built from legacy state
  const filters = useMemo(() => 
    buildGenerateFiltersFromLegacy({
      cuisines,
      cookingConstraints,
      dietMode
    }), 
    [cuisines, cookingConstraints, dietMode]
  );

  // Set unified filters - maps back to legacy state for backward compatibility
  // This allows parent components to control filters while keeping legacy state in sync
  const setFilters = useCallback((nextFilters) => {
    // Map filters.cuisine -> cuisines
    if (nextFilters.cuisine) {
      setCuisines(nextFilters.cuisine);
    }
    
    // Map filters.diet -> dietMode (pick first, or 'general' if empty)
    if (nextFilters.diet && nextFilters.diet.length > 0) {
      setDietMode(nextFilters.diet[0]); // dietMode is single-value in legacy
    } else if (!nextFilters.diet || nextFilters.diet.length === 0) {
      setDietMode('general');
    }
    
    // Map filters.method / filters.speed / filters.difficulty -> cookingConstraints
    const newConstraints = [];
    
    // Add difficulty values
    if (nextFilters.difficulty) {
      newConstraints.push(...nextFilters.difficulty);
    }
    // Add method values
    if (nextFilters.method) {
      newConstraints.push(...nextFilters.method);
    }
    // Add speed values (convert to legacy format)
    if (nextFilters.speed) {
      for (const speed of nextFilters.speed) {
        if (speed === 'quick') newConstraints.push('under_15');
        else if (speed === 'normal') newConstraints.push('under_60');
      }
    }
    
    setCookingConstraints(newConstraints);
    
    // NOTE: exclusions NOT mapped - they remain separate (avoid vs include semantic difference)
  }, []);

  return {
    // Planning
    daysPerWeek, setDaysPerWeek,
    dishesPerDay, setDishesPerDay,
    servings, setServings,
    // Preferences
    dietMode, setDietMode,
    budget, setBudget,
    ingredientReuse, setIngredientReuse,
    // Filters
    exclusions, setExclusions,
    cuisines, setCuisines,
    cookingConstraints, setCookingConstraints,
    // Handlers
    toggleExclusion,
    toggleCuisine,
    toggleConstraint,
    clearFilters,
    // Derived unified filters
    filters,
    setFilters, // Allow external control while syncing with legacy state
  };
}
