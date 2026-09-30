// Recipe filters hook - unified filter system
import { useState, useMemo, useCallback } from 'react';
import { recipeMatchesFilters } from '@/constants/filters';
import { RECIPE_FILTER_GROUPS, buildFilterSections } from '@/constants/filterGroups';

export function useRecipeFilters(options = {}) {
  const { initialShowFilters = true } = options;
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
  const [showFilters, setShowFilters] = useState(initialShowFilters);

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
    
    // Apply sorting. Missing values are unknown, never an extreme - they
    // always sort last, and ties break on id (oldest: ascending, every
    // other mode: descending) for deterministic ordering.
    const createdAtTime = (r) => {
      const v = r.created_at ?? r.createdAt;
      if (v == null) return null;
      const t = new Date(v).getTime();
      return Number.isNaN(t) ? null : t;
    };
    const SORT_FIELDS = {
      newest: { get: createdAtTime, ascending: false },
      oldest: { get: createdAtTime, ascending: true },
      popular: { get: (r) => r.times_shown ?? r.timesShown ?? null, ascending: false },
      time_short: { get: (r) => r.total_time_minutes ?? r.totalTimeMinutes ?? null, ascending: true },
      calories_low: { get: (r) => r.calories_per_serving ?? r.caloriesPerServing ?? null, ascending: true },
      protein_high: { get: (r) => r.protein_g ?? r.proteinG ?? null, ascending: false },
    };

    const sortConfig = SORT_FIELDS[sortBy];
    if (sortConfig) {
      const { get, ascending } = sortConfig;
      const idDirection = sortBy === 'oldest' ? 1 : -1;
      const byId = (a, b) => (a.id < b.id ? -idDirection : a.id > b.id ? idDirection : 0);
      filtered.sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        if (av == null || bv == null) {
          if (av == null && bv == null) return byId(a, b);
          return av == null ? 1 : -1;
        }
        const comparison = av < bv ? -1 : av > bv ? 1 : 0;
        return comparison ? (ascending ? comparison : -comparison) : byId(a, b);
      });
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
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
