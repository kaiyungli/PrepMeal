import { useState, useEffect, useCallback } from 'react';
import { DIET_MODES, CUISINES, COOKING_CONSTRAINTS } from '@/constants/filters';

// Filter options based on actual DB schema
const cuisineOptions = [
  { value: 'chinese', label: '中式' },
  { value: 'western', label: '西式' },
  { value: 'japanese', label: '日式' },
  { value: 'korean', label: '韓式' },
  { value: 'thai', label: '泰式' },
  { value: 'fusion', label: '混合' },
];

const dishTypeOptions = [
  { value: 'main', label: '主菜' },
  { value: 'side', label: '配菜' },
  { value: 'soup', label: '湯' },
  { value: 'staple', label: '主食' },
  { value: 'snack', label: '小食' },
];

const timeOptions = [
  { value: '15', label: '15分鐘內', icon: '⚡' },
  { value: '30', label: '30分鐘內', icon: '⏱️' },
  { value: '60', label: '60分鐘內', icon: '🐢' },
];

const difficultyOptions = [
  { value: 'easy', label: '簡單' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '複雜' },
];

const methodOptions = [
  { value: 'stir_fry', label: '炒', icon: '🥘' },
  { value: 'steamed', label: '蒸', icon: '🥟' },
  { value: 'fried', label: '煎/炸', icon: '🍳' },
  { value: 'braised', label: '燜/紅燒', icon: '🍖' },
  { value: 'boiled', label: '煮/湯', icon: '🍲' },
  { value: 'baked', label: '焗', icon: '🧀' },
];

const dietOptions = [
  { value: 'vegetarian', label: '素食' },
  { value: 'egg_lacto', label: '蛋奶素' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_fat', label: '低脂' },
  { value: 'low_calorie', label: '低卡' },
  { value: 'gluten_free', label: '無麩質' },
];

const proteinOptions = [
  { value: 'chicken', label: '雞' },
  { value: 'beef', label: '牛' },
  { value: 'pork', label: '豬' },
  { value: 'fish', label: '魚' },
  { value: 'shrimp', label: '蝦' },
  { value: 'tofu', label: '豆腐' },
  { value: 'egg', label: '蛋' },
  { value: 'vegetarian', label: '素' },
  { value: 'mixed', label: '混合' },
];



export { cuisineOptions, dishTypeOptions, timeOptions, difficultyOptions, methodOptions, dietOptions, proteinOptions, budgetOptions };

export function useRecipeFilters(initialRecipes = []) {
  // State
  const [recipes, setRecipes] = useState(initialRecipes);
  const [loading, setLoading] = useState(false);
  
  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Filter states - Primary
  const [modalCuisine, setModalCuisine] = useState([]);
  const [modalDishType, setModalDishType] = useState([]);
  const [modalTime, setModalTime] = useState([]);
  const [modalDifficulty, setModalDifficulty] = useState([]);
  
  // Filter states - Advanced
  const [modalMethod, setModalMethod] = useState([]);
  const [modalDiet, setModalDiet] = useState([]);
  const [modalProtein, setModalProtein] = useState([]);
  
  
  // Advanced visibility
  const [showAdvanced, setShowAdvanced] = useState(true);

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
    modalDishType.length > 0 ||
    modalTime.length > 0 ||
    modalDifficulty.length > 0 ||
    modalMethod.length > 0 ||
    modalDiet.length > 0 ||
    modalProtein.length > 0
  );

  // Active filter count
  const activeFilterCount = 
    modalCuisine.length +
    modalDishType.length +
    modalTime.length +
    modalDifficulty.length +
    modalMethod.length +
    modalDiet.length +
    modalProtein.length +
    (searchQuery?.trim() ? 1 : 0);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setModalCuisine([]);
    setModalDishType([]);
    setModalTime([]);
    setModalDifficulty([]);
    setModalMethod([]);
    setModalDiet([]);
    setModalProtein([]);
    setModalBudget([]);
    setModalCompleteMeal([]);
    setSortBy('newest');
  }, []);

  // Build query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (modalCuisine.length > 0) params.set('cuisine', modalCuisine.join(','));
    if (modalDishType.length > 0) params.set('dish_type', modalDishType.join(','));
    if (modalTime.length > 0) params.set('maxTime', modalTime.join(','));
    if (modalDifficulty.length > 0) params.set('difficulty', modalDifficulty.join(','));
    if (modalMethod.length > 0) params.set('method', modalMethod.join(','));
    if (modalDiet.length > 0) params.set('diet', modalDiet.join(','));
    if (modalProtein.length > 0) params.set('protein', modalProtein.join(','));
    if (sortBy !== 'newest') params.set('sort', sortBy);
    
    return params;
  }, [searchQuery, modalCuisine, modalDishType, modalTime, modalDifficulty, modalMethod, modalDiet, modalProtein, sortBy]);

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
  // Primary: cuisine, dish_type, time, difficulty
  // Advanced: method, diet, primary_protein, budget_level, is_complete_meal
  const recipeFilterSections = [
    // Primary
    { id: "cuisine", title: "菜系", options: cuisineOptions, selected: modalCuisine, onToggle: (v) => toggleFilter(modalCuisine, v, setModalCuisine) },
    { id: "dishType", title: "餐類", options: dishTypeOptions, selected: modalDishType, onToggle: (v) => toggleFilter(modalDishType, v, setModalDishType) },
    { id: "time", title: "時間", options: timeOptions, selected: modalTime, onToggle: (v) => toggleFilter(modalTime, v, setModalTime) },
    { id: "difficulty", title: "難度", options: difficultyOptions, selected: modalDifficulty, onToggle: (v) => toggleFilter(modalDifficulty, v, setModalDifficulty) },
    // Advanced
    { id: "method", title: "烹調方式", options: methodOptions, selected: modalMethod, onToggle: (v) => toggleFilter(modalMethod, v, setModalMethod) },
    { id: "diet", title: "飲食模式", options: dietOptions, selected: modalDiet, onToggle: (v) => toggleFilter(modalDiet, v, setModalDiet) },
    { id: "protein", title: "主要蛋白", options: proteinOptions, selected: modalProtein, onToggle: (v) => toggleFilter(modalProtein, v, setModalProtein) },
  ];

  return {
    // State
    recipes,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    // Primary filters
    modalCuisine,
    setModalCuisine,
    modalDishType,
    setModalDishType,
    modalTime,
    setModalTime,
    modalDifficulty,
    setModalDifficulty,
    // Advanced filters
    modalMethod,
    setModalMethod,
    modalDiet,
    setModalDiet,
    modalProtein,
    setModalProtein,
    // UI state
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
