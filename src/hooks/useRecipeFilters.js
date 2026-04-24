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
      setFilters(prev => ({ ...prev, [groupKey]: newValues }));
    }
  ), [filters]);

  const hasFilters = Object.values(filters).some(arr => arr && arr.length > 0);
  
  // Development debug log - removed for cleaner console
  const activeFilterCount = Object.values(filters).reduce(
    (sum, arr) => sum + (arr?.length || 0), 
    0
  );

  const clearFilters = () => {
    setFilters(prev => ({
      cuisine: [],
      dish_type: [],
      protein: [],
      method: [],
      speed: [],
      difficulty: [],
      diet: [],
      flavor: [],
    }));
  };

  // Filter recipes function - memoized for stability
  const filterRecipes = useCallback((recipes) => {
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
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime() || 0;
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime() || 0;
        return dateB - dateA;
      } else if (sortBy === 'oldest') {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime() || 0;
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime() || 0;
        return dateA - dateB;
      } else if (sortBy === 'popular') {
        return (b.times_shown || b.timesShown || 0) - (a.times_shown || a.timesShown || 0);
      } else if (sortBy === 'time_short') {
        return (a.total_time_minutes || a.totalTimeMinutes || 999) - (b.total_time_minutes || b.totalTimeMinutes || 999);
      } else if (sortBy === 'calories_low') {
        return (a.calories_per_serving || a.caloriesPerServing || 999) - (b.calories_per_serving || b.caloriesPerServing || 999);
      } else if (sortBy === 'protein_high') {
        return (b.protein_g || b.proteinG || 0) - (a.protein_g || a.proteinG || 0);
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
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
