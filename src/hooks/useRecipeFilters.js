import { useState, useEffect, useCallback } from 'react';
import { DIET_MODES, EXCLUSIONS, CUISINES, COOKING_CONSTRAINTS } from '@/constants/filters';

// Filter options
const cuisineOptions = CUISINES.filter(c => ['chinese', 'western'].includes(c.value));
const timeOptions = [
  { value: 'quick', label: '15分鐘內', icon: '⚡' },
  { value: 'normal', label: '15-30分鐘', icon: '⏱️' },
  { value: 'slow', label: '30分鐘以上', icon: '🐢' },
];
const difficultyOptions = COOKING_CONSTRAINTS.filter(c => ['easy', 'medium', 'hard'].includes(c.value));
const methodOptions = [
  { value: 'stir_fry', label: '炒', icon: '🥘' },
  { value: 'boiled', label: '煮/湯', icon: '🍲' },
  { value: 'steamed', label: '蒸', icon: '🥟' },
  { value: 'fried', label: '煎/炸', icon: '🍳' },
  { value: 'baked', label: '焗', icon: '🧀' },
  { value: 'braised', label: '燜/紅燒', icon: '🍖' },
];
const dietOptions = DIET_MODES.filter(d => ['vegetarian', 'egg_lacto', 'high_protein', 'low_fat', 'low_calorie', 'light'].includes(d.value));
const exclusionOptions = [
  { value: 'no_beef', label: '無牛肉', icon: '🐄' },
  { value: 'no_pork', label: '無豬肉', icon: '🐷' },
  { value: 'no_chicken', label: '無雞肉', icon: '🐔' },
  { value: 'no_seafood', label: '無海鮮', icon: '🦐' },
];

export { cuisineOptions, timeOptions, difficultyOptions, methodOptions, dietOptions, exclusionOptions };

export function useRecipeFilters(initialRecipes = []) {
  // State
  const [recipes, setRecipes] = useState(initialRecipes);
  const [loading, setLoading] = useState(false);
  
  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Filter states
  const [modalCuisine, setModalCuisine] = useState([]);
  const [modalTime, setModalTime] = useState([]);
  const [modalDifficulty, setModalDifficulty] = useState([]);
  const [modalMethod, setModalMethod] = useState([]);
  const [modalDiet, setModalDiet] = useState([]);
  const [modalExclusions, setModalExclusions] = useState([]);
  
  // Advanced visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Toggle filter helper
  const toggleFilter = useCallback((current, value, setter) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  }, []);

  // Check if any filters are active
  const hasFilters = Boolean(
    searchQuery?.trim() ||
    modalCuisine.length > 0 ||
    modalTime.length > 0 ||
    modalDifficulty.length > 0 ||
    modalMethod.length > 0 ||
    modalDiet.length > 0 ||
    modalExclusions.length > 0
  );

  // Active filter count
  const activeFilterCount = 
    modalCuisine.length +
    modalTime.length +
    modalDifficulty.length +
    modalMethod.length +
    modalDiet.length +
    modalExclusions.length +
    (searchQuery?.trim() ? 1 : 0);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setModalCuisine([]);
    setModalTime([]);
    setModalDifficulty([]);
    setModalMethod([]);
    setModalDiet([]);
    setModalExclusions([]);
    setSortBy('newest');
  }, []);

  // Build query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (modalCuisine.length > 0) params.set('cuisine', modalCuisine.join(','));
    if (modalTime.length > 0) params.set('time', modalTime.join(','));
    if (modalDifficulty.length > 0) params.set('difficulty', modalDifficulty.join(','));
    if (modalMethod.length > 0) params.set('method', modalMethod.join(','));
    if (modalDiet.length > 0) params.set('diet', modalDiet.join(','));
    if (modalExclusions.length > 0) params.set('exclusions', modalExclusions.join(','));
    if (sortBy !== 'newest') params.set('sort', sortBy);
    
    return params;
  }, [searchQuery, modalCuisine, modalTime, modalDifficulty, modalMethod, modalDiet, modalExclusions, sortBy]);

  // Fetch recipes with filters
  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildQueryParams();
      const res = await fetch(`/api/recipes?${params.toString()}`);
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (e) {
      console.error('Failed to fetch recipes:', e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  // Fetch when filters change
  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // Filter sections for SharedFilterPanel
  const recipeFilterSections = [
    { id: "cuisine", title: "菜系", options: cuisineOptions.filter(c => c.value), selected: modalCuisine, onToggle: (v) => toggleFilter(modalCuisine, v, setModalCuisine) },
    { id: "time", title: "烹飪時間", options: timeOptions, selected: modalTime, onToggle: (v) => toggleFilter(modalTime, v, setModalTime) },
    { id: "difficulty", title: "難度", options: difficultyOptions, selected: modalDifficulty, onToggle: (v) => toggleFilter(modalDifficulty, v, setModalDifficulty) },
    { id: "method", title: "烹調方式", options: methodOptions, selected: modalMethod, onToggle: (v) => toggleFilter(modalMethod, v, setModalMethod) },
    { id: "diet", title: "飲食偏好", options: dietOptions, selected: modalDiet, onToggle: (v) => toggleFilter(modalDiet, v, setModalDiet) },
    { id: "exclusions", title: "排除項目", options: exclusionOptions.slice(0, 4), selected: modalExclusions, onToggle: (v) => toggleFilter(modalExclusions, v, setModalExclusions), variant: "danger" },
  ];

  return {
    // State
    recipes,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    modalCuisine,
    setModalCuisine,
    modalTime,
    setModalTime,
    modalDifficulty,
    setModalDifficulty,
    modalMethod,
    setModalMethod,
    modalDiet,
    setModalDiet,
    modalExclusions,
    setModalExclusions,
    showAdvanced,
    setShowAdvanced,
    // Helpers
    toggleFilter,
    hasFilters,
    activeFilterCount,
    clearFilters,
    fetchRecipes,
    buildQueryParams,
    recipeFilterSections,
  };
}
