// Recipe filters hook - unified filter system
import { useState, useMemo, useCallback } from 'react';
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

  // Build filter sections using centralized config - memoized
  const recipeFilterSections = useMemo(() => buildFilterSections(
    RECIPE_FILTER_GROUPS,
    filters,
    (groupKey, value) => {
      const current = filters[groupKey] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setFilters({ ...filters, [groupKey]: newValues });
    }
  ), [filters]);

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

  // Filter recipes function - memoized for stability
  const filterRecipes = useCallback((recipes) => {
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
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return (b.created_at || b.createdAt || 0) - (a.created_at || a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return (a.created_at || a.createdAt || 0) - (b.created_at || b.createdAt || 0);
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'popular') {
        return (b.times_shown || b.timesShown || 0) - (a.times_shown || a.timesShown || 0);
      }
      return 0;
    });
    
    return filtered;
  }, [hasFilters, searchQuery, filters, sortBy]);

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
