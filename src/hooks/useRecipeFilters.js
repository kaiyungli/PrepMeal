// Recipe filters hook - unified filter system
import { useState, useMemo } from 'react';
import { recipeMatchesFilters } from '@/constants/filters';
import { RECIPE_FILTER_GROUPS, buildFilterSections } from '@/constants/filterGroups';

export function useRecipeFilters() {
  const [filters, setFilters] = useState({
    cuisine: [],
    dish_type: [],
    protein: [],
    method: [],
    speed: [],
    difficulty: [],
    diet: [],
    flavor: [],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(true);

  // Build filter sections using centralized config
  const recipeFilterSections = buildFilterSections(
    RECIPE_FILTER_GROUPS,
    filters,
    (groupKey, value) => {
      const current = filters[groupKey] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setFilters({ ...filters, [groupKey]: newValues });
    }
  );

  const hasFilters = Object.values(filters).some(arr => arr && arr.length > 0);
  
  const activeFilterCount = Object.values(filters).reduce(
    (sum, arr) => sum + (arr?.length || 0), 
    0
  );

  const clearFilters = () => {
    setFilters({
      cuisine: [],
      dish_type: [],
      protein: [],
      method: [],
      speed: [],
      difficulty: [],
      diet: [],
      flavor: [],
    });
  };

  // Filter recipes function
  const filterRecipes = (recipes) => {
    if (!hasFilters && !searchQuery) {
      return recipes;
    }
    
    let filtered = [...recipes];
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }
    
    // Apply filters using unified matching
    if (hasFilters) {
      filtered = filtered.filter(recipe => recipeMatchesFilters(recipe, filters));
    }
    
    return filtered;
  };

  return {
    // State
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    // UI
    recipeFilterSections,
    hasFilters,
    activeFilterCount,
    clearFilters,
    // Actions
    filterRecipes,
  };
}
