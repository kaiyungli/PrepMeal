// Hook for generate page preferences and filters
import { useState, useCallback } from 'react';

export function useGeneratePreferences() {
  // Planning settings
  const [daysPerWeek, setDaysPerWeek] = useState(7);
  const [dishesPerDay, setDishesPerDay] = useState(1);
  const [servings, setServings] = useState(2);
  
  // Preference settings  
  const [dietMode, setDietMode] = useState('general');
  const [budget, setBudget] = useState('normal');
  const [ingredientReuse, setIngredientReuse] = useState('normal');
  
  // Filter settings
  const [exclusions, setExclusions] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [cookingConstraints, setCookingConstraints] = useState([]);

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
  };
}
