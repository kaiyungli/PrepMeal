import { useState, useEffect, useCallback } from 'react';
import { DIET_MODES, EXCLUSIONS, CUISINES, COOKING_CONSTRAINTS } from '@/constants/filters';

// Filter options
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
  { value: 'staple', label: '主食' },
  { value: 'soup', label: '湯' },
  { value: 'dessert', label: '甜品' },
];

const timeOptions = [
  { value: 'quick', label: '15分鐘內', icon: '⚡' },
  { value: 'normal', label: '15-30分鐘', icon: '⏱️' },
  { value: 'slow', label: '30分鐘以上', icon: '🐢' },
];

const difficultyOptions = [
  { value: 'easy', label: '簡單' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '複雜' },
];

const methodOptions = [
  { value: 'stir_fry', label: '炒', icon: '🥘' },
  { value: 'boiled', label: '煮/湯', icon: '🍲' },
  { value: 'steamed', label: '蒸', icon: '🥟' },
  { value: 'fried', label: '煎/炸', icon: '🍳' },
  { value: 'baked', label: '焗', icon: '🧀' },
  { value: 'braised', label: '燜/紅燒', icon: '🍖' },
  { value: 'steamed', label: '蒸', icon: '🥟' },
];

const dietOptions = [
  { value: 'vegetarian', label: '素食' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_fat', label: '低脂' },
  { value: 'low_calorie', label: '低卡' },
  { value: 'gluten_free', label: '無麩質' },
  { value: 'dairy_free', label: '無奶製品' },
];

const exclusionOptions = [
  { value: 'no_beef', label: '無牛肉' },
  { value: 'no_pork', label: '無豬肉' },
  { value: 'no_chicken', label: '無雞肉' },
  { value: 'no_seafood', label: '無海鮮' },
  { value: 'no_egg', label: '無蛋' },
  { value: 'no_soy', label: '無豆製品' },
];

const goalOptions = [
  { value: 'muscle', label: '增肌' },
  { value: 'fat_loss', label: '減脂' },
  { value: 'maintain', label: '維持' },
  { value: 'energy', label: '補充能量' },
  { value: 'light', label: '輕盈' },
];

export { cuisineOptions, dishTypeOptions, timeOptions, difficultyOptions, methodOptions, dietOptions, exclusionOptions, goalOptions };

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
  const [modalExclusions, setModalExclusions] = useState([]);
  const [modalGoal, setModalGoal] = useState([]);
  
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
    modalDishType.length > 0 ||
    modalTime.length > 0 ||
    modalDifficulty.length > 0 ||
    modalMethod.length > 0 ||
    modalDiet.length > 0 ||
    modalExclusions.length > 0 ||
    modalGoal.length > 0
  );

  // Active filter count
  const activeFilterCount = 
    modalCuisine.length +
    modalDishType.length +
    modalTime.length +
    modalDifficulty.length +
    modalMethod.length +
    modalDiet.length +
    modalExclusions.length +
    modalGoal.length +
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
    setModalExclusions([]);
    setModalGoal([]);
    setSortBy('newest');
  }, []);

  // Build query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (modalCuisine.length > 0) params.set('cuisine', modalCuisine.join(','));
    if (modalDishType.length > 0) params.set('dish_type', modalDishType.join(','));
    if (modalTime.length > 0) params.set('time', modalTime.join(','));
    if (modalDifficulty.length > 0) params.set('difficulty', modalDifficulty.join(','));
    if (modalMethod.length > 0) params.set('method', modalMethod.join(','));
    if (modalDiet.length > 0) params.set('diet', modalDiet.join(','));
    if (modalExclusions.length > 0) params.set('exclusions', modalExclusions.join(','));
    if (modalGoal.length > 0) params.set('goal', modalGoal.join(','));
    if (sortBy !== 'newest') params.set('sort', sortBy);
    
    return params;
  }, [searchQuery, modalCuisine, modalDishType, modalTime, modalDifficulty, modalMethod, modalDiet, modalExclusions, modalGoal, sortBy]);

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
  // Primary: 菜系, 餐類, 時間, 難度
  // Advanced: 烹調方式, 飲食模式, 排除, 目標
  const recipeFilterSections = [
    // Primary
    { id: "cuisine", title: "菜系", options: cuisineOptions, selected: modalCuisine, onToggle: (v) => toggleFilter(modalCuisine, v, setModalCuisine) },
    { id: "dishType", title: "餐類", options: dishTypeOptions, selected: modalDishType, onToggle: (v) => toggleFilter(modalDishType, v, setModalDishType) },
    { id: "time", title: "時間", options: timeOptions, selected: modalTime, onToggle: (v) => toggleFilter(modalTime, v, setModalTime) },
    { id: "difficulty", title: "難度", options: difficultyOptions, selected: modalDifficulty, onToggle: (v) => toggleFilter(modalDifficulty, v, setModalDifficulty) },
    // Advanced
    { id: "method", title: "烹調方式", options: methodOptions, selected: modalMethod, onToggle: (v) => toggleFilter(modalMethod, v, setModalMethod) },
    { id: "diet", title: "飲食模式", options: dietOptions, selected: modalDiet, onToggle: (v) => toggleFilter(modalDiet, v, setModalDiet) },
    { id: "exclusions", title: "排除", options: exclusionOptions, selected: modalExclusions, onToggle: (v) => toggleFilter(modalExclusions, v, setModalExclusions), variant: "danger" },
    { id: "goal", title: "目標", options: goalOptions, selected: modalGoal, onToggle: (v) => toggleFilter(modalGoal, v, setModalGoal) },
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
    modalExclusions,
    setModalExclusions,
    modalGoal,
    setModalGoal,
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
