'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { FilterChip, FilterSection, SharedFilterPanel } from '@/components/filters';
import { DIET_MODES, EXCLUSIONS, CUISINES, COOKING_CONSTRAINTS } from '@/constants/filters';

console.log('[CLIENT] Module loaded');

// Quick filter chips
const QUICK_FILTERS = [
  { id: 'quick', label: '⚡ 15分鐘', value: '15' },
  { id: 'easy', label: '😊 簡易', value: 'easy' },
  { id: 'protein', label: '💪 高蛋白', value: 'protein' },
  { id: 'vegetarian', label: '🥬 素食', value: 'vegetarian' },
  { id: 'lowcal', label: '🔥 低卡', value: 'lowcal' },
];

// Filter options with UI label -> DB value mapping
// Use shared constants from @/constants/filters
const cuisineOptions = CUISINES.filter(c => ['chinese', 'western'].includes(c.value));
const timeOptions = [
  { label: '15分鐘內', value: '15' },
  { label: '30分鐘內', value: '30' },
  { label: '45分鐘內', value: '45' },
  { label: '60分鐘內', value: '60' },
];
const difficultyOptions = COOKING_CONSTRAINTS.filter(c => ['easy', 'medium', 'hard'].includes(c.value));
const methodOptions = [
  { label: '炒', value: 'stir_fry' },
  { label: '蒸', value: 'steamed' },
  { label: '煮', value: 'boiled' },
  { label: '焗', value: 'baked' },
  { label: '煎', value: 'fried' },
  { label: '燉', value: 'braised' },
  { label: '氣炸', value: 'air_fryer' },
  { label: '一鍋煮', value: 'one_pot' },
];
const dietOptions = DIET_MODES.filter(d => ['vegetarian', 'egg_lacto', 'high_protein', 'low_fat', 'low_calorie', 'light'].includes(d.value));
const exclusionOptions = [
  { label: '不要牛肉', value: 'no_beef' },
  { label: '不要豬肉', value: 'no_pork' },
  { label: '不要雞肉', value: 'no_chicken' },
  { label: '不要海鮮', value: 'no_seafood' },
  { label: '不要蛋', value: 'no_eggs' },
  { label: '不要奶', value: 'no_dairy' },
  { label: '不要辣', value: 'no_spicy' },
];
const budgetOptions = [
  { label: '平價', value: 'budget' },
  { label: '一般', value: 'normal' },
  { label: '高級', value: 'premium' },
];

const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'popular', label: '最受歡迎' },
  { value: 'quick', label: '最快完成' },
  { value: 'high_protein', label: '高蛋白' },
];

export default function Home({ initialRecipes = [], ssrError = null }) {
  const [recipes, setRecipes] = useState(initialRecipes || []);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Filter states
  const [pantryInput, setPantryInput] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  
  // Filter modal states
  const [modalCuisine, setModalCuisine] = useState([]);
  const [modalTime, setModalTime] = useState([]);
  const [modalDifficulty, setModalDifficulty] = useState([]);
  const [modalMethod, setModalMethod] = useState([]);
  const [modalDiet, setModalDiet] = useState([]);
  const [modalExclusions, setModalExclusions] = useState([]);
  const [modalBudget, setModalBudget] = useState([]);

  // Toggle function for multi-select
  const toggleFilter = (arr, val, setter) => {
    if (arr.includes(val)) {
      setter(arr.filter(v => v !== val));
    } else {
      setter([...arr, val]);
    }
  };

  // Filter sections for SharedFilterPanel
  const recipeFilterSections = [
    { id: "cuisine", title: "菜系", options: cuisineOptions.filter(c => c.value), selected: modalCuisine, onToggle: (v) => toggleFilter(modalCuisine, v, setModalCuisine) },
    { id: "time", title: "烹飪時間", options: timeOptions, selected: modalTime, onToggle: (v) => toggleFilter(modalTime, v, setModalTime) },
    { id: "difficulty", title: "難度", options: difficultyOptions, selected: modalDifficulty, onToggle: (v) => toggleFilter(modalDifficulty, v, setModalDifficulty) },
    { id: "method", title: "烹調方式", options: methodOptions, selected: modalMethod, onToggle: (v) => toggleFilter(modalMethod, v, setModalMethod) },
    { id: "diet", title: "飲食偏好", options: dietOptions, selected: modalDiet, onToggle: (v) => toggleFilter(modalDiet, v, setModalDiet) },
    { id: "exclusions", title: "排除項目", options: exclusionOptions.slice(0, 4), selected: modalExclusions, onToggle: (v) => toggleFilter(modalExclusions, v, setModalExclusions), variant: "danger" },
  ];

  // Derived state - use this consistently
  const hasFilters = Boolean(
    searchQuery?.trim() ||
    modalCuisine.length > 0 ||
    modalTime.length > 0 ||
    modalDifficulty.length > 0 ||
    modalMethod.length > 0 ||
    modalDiet.length > 0 ||
    modalExclusions.length > 0 ||
    modalBudget.length > 0 ||
    activeFilters.length > 0
  );
  
  // Ensure recipes is always an array
  const recipesList = recipes || [];

  // Fetch recipes with filters
  const fetchRecipes = async () => {
    console.log('[CLIENT] ====== START ======');
    console.log('[CLIENT] activeFilters:', activeFilters);
    console.log('[CLIENT] sortBy:', sortBy);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (activeFilters.includes('15')) params.set('maxTime', '15');
      if (activeFilters.includes('easy')) params.set('difficulty', 'easy');
      if (activeFilters.includes('protein')) params.set('sort', 'high_protein');
      if (activeFilters.includes('vegetarian')) params.set('diet', 'vegetarian');
      if (activeFilters.includes('lowcal')) params.set('sort', 'low_calorie');
      if (modalCuisine.length > 0) params.set('cuisine', modalCuisine.join(','));
      if (modalTime.length > 0) params.set('maxTime', modalTime.join(','));
      if (modalDifficulty.length > 0) params.set('difficulty', modalDifficulty.join(','));
      if (modalMethod.length > 0) params.set('method', modalMethod.join(','));
      if (modalDiet.length > 0) params.set('diet', modalDiet.join(','));
      if (modalExclusions.length > 0) params.set('exclusions', modalExclusions.join(','));
      if (modalBudget.length > 0) params.set('budget', modalBudget.join(','));
      if (sortBy !== 'newest' && !activeFilters.includes('protein') && !activeFilters.includes('lowcal')) params.set('sort', sortBy);
      
      const url = `/api/recipes?${params.toString()}`;
      console.log('[CLIENT] Request URL:', url);
      
      const res = await fetch(url);
      console.log('[CLIENT] Response status:', res.status);
      const data = await res.json();
      console.log('[CLIENT] Response:', { error: data.error, count: data.recipes?.length });
      console.log('[CLIENT] First recipe:', data.recipes?.[0]?.name);
      console.log('[CLIENT] ====== END ======');
      
      setRecipes(data.recipes || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Only fetch when user applies filters explicitly
  useEffect(() => {
    // Skip on initial SSR load - use initialRecipes
    if (hasFilters || sortBy !== 'newest') {
      fetchRecipes();
    }
  }, [activeFilters, sortBy, searchQuery, modalCuisine, modalTime, modalDifficulty, modalMethod, modalDiet]);

  const handlePantrySearch = () => {
    const ingredients = pantryInput.split(',').map(s => s.trim()).filter(Boolean);
    if (ingredients.length > 0) {
      window.location.href = `/generate?pantry=${encodeURIComponent(ingredients.join(','))}`;
    } else {
      window.location.href = '/generate';
    }
  };

  const handleQuickFilter = (filterId) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const handleRecipeClick = (recipe) => {
    setModalLoading(true);
    fetch(`/api/recipes/${recipe.id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedRecipe(data);
        setModalLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setModalLoading(false);
      });
  };

  const applyFilters = () => {
    fetchRecipes();
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilters([]);
    setModalCuisine([]);
    setModalTime([]);
    setModalDifficulty([]);
    setModalMethod([]);
    setModalDiet([]);
    setModalExclusions([]);
    setModalBudget([]);
    setSortBy('newest');
    fetchRecipes();
  };

  const hasSearch = searchQuery?.trim()?.length > 0;
  
  // Show empty state only if filters applied and no results
  const showEmptyState = !loading && hasFilters && recipesList.length === 0;
  
  // Show skeleton when loading with no data
  const showSkeleton = loading;

  // Determine recipe count text
  const recipeCountText = loading ? '載入中...' : 
    (recipesList.length > 0 ? `${recipesList.length} 個食譜` : 
    (hasFilters ? '無符合條件既食譜' : '載入緊...'));

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

            <HomeHero onPrimaryAction={handlePantrySearch} />

      {/* Recipe Section - Homepage Style */}
      <section id="recipes" className="pt-8 pb-24 bg-[#F8F3E8]">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* 1. Centered Heading */}
          <div className="text-center mb-8">
            <div className="text-xs font-extrabold text-[#F0A060] uppercase tracking-widest mb-3">⭐ 食譜庫</div>
            <h2 className="text-[1.5rem] md:text-[2.25rem] font-black text-[#3A2010] mb-2">食譜</h2>
            <p className="text-sm font-semibold text-[#C0A080]">{recipeCountText}</p>
          </div>

          {/* 2. Search Bar */}
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AA7A50]">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="尋食譜... 例如：番茄、牛肉、咖哩"
              className="w-full py-3.5 pl-11 pr-11 rounded-xl border-2 border-[#DDD0B0] bg-white text-[#3A2010] placeholder:text-[#C0A080] focus:outline-none focus:border-[#9B6035] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AA7A50] hover:text-[#9B6035]"
              >
                ✕
              </button>
            )}
          </div>

          {/* 3. Advanced Filter Box */}
          <div className="bg-white rounded-xl border border-[#E5DCC8] shadow-sm mb-8 overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="text-sm font-semibold text-[#7A5A38]">篩選</span>
              <span className="text-[#9B6035]">{showAdvanced ? '▲ 收起' : '▼ 展開'}</span>
            </div>
            
            {showAdvanced && (
              <div className="px-4 pb-4 flex flex-col gap-6">
                {/* 菜系 */}
                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#7A5A38] tracking-[0.01em]">菜系</div>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 pr-2">
                    {cuisineOptions.filter(c => c.value).map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleFilter(modalCuisine, c.value, setModalCuisine)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          modalCuisine.includes(c.value)
                            ? 'bg-[#9B6035] border-[#9B6035] text-white'
                            : 'bg-[#F8F3E8] border border-[#E5DCC8] text-[#7A5A38] hover:bg-[#F4EDDD]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 難度 */}
                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#7A5A38] tracking-[0.01em]">難度</div>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 pr-2">
                    {difficultyOptions.map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleFilter(modalDifficulty, c.value, setModalDifficulty)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          modalDifficulty.includes(c.value)
                            ? 'bg-[#9B6035] border-[#9B6035] text-white'
                            : 'bg-[#F8F3E8] border border-[#E5DCC8] text-[#7A5A38] hover:bg-[#F4EDDD]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 時間 */}
                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#7A5A38] tracking-[0.01em]">時間</div>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 pr-2">
                    {timeOptions.map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleFilter(modalTime, c.value, setModalTime)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          modalTime.includes(c.value)
                            ? 'bg-[#9B6035] border-[#9B6035] text-white'
                            : 'bg-[#F8F3E8] border border-[#E5DCC8] text-[#7A5A38] hover:bg-[#F4EDDD]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 排除 */}
                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#7A5A38] tracking-[0.01em]">排除</div>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 pr-2">
                    {exclusionOptions.slice(0, 6).map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleFilter(modalExclusions, c.value, setModalExclusions)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          modalExclusions.includes(c.value)
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-[#F8F3E8] border border-[#E5DCC8] text-[#7A5A38] hover:bg-[#F4EDDD]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 飲食模式 */}
                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#7A5A38] tracking-[0.01em]">飲食模式</div>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 pr-2">
                    {dietOptions.slice(0, 5).map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleFilter(modalDiet, c.value, setModalDiet)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          modalDiet.includes(c.value)
                            ? 'bg-[#9B6035] border-[#9B6035] text-white'
                            : 'bg-[#F8F3E8] border border-[#E5DCC8] text-[#7A5A38] hover:bg-[#F4EDDD]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Clear All */}
                <div className="mt-6 pt-4 border-t border-[#F2EBDD]">
                  <button
                    onClick={clearFilters}
                    className="text-sm font-semibold text-[#9B6035] hover:underline"
                  >
                    清除全部
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Count + Sort Row */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-[#C0A080]">{recipeCountText}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-full border border-[#DDD0B0] bg-white text-sm font-medium text-[#3A2010] focus:outline-none"
            >
              {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* 5. Recipe Cards Grid */}
          {showSkeleton && (
            <div className="grid grid-cols-12 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="col-span-12 sm:col-span-6 md:col-span-4 animate-pulse">
                  <div className="bg-[#F8F3E8] rounded-2xl border-2 border-[#DDD0B0] overflow-hidden">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showSkeleton && recipesList.length > 0 && (
            <div className="grid grid-cols-12 gap-6">
              {recipesList.map(recipe => (
                <div key={recipe.id} className="col-span-12 sm:col-span-6 md:col-span-4">
                  <RecipeCard
                    recipe={recipe}
                    onClick={() => handleRecipeClick(recipe)}
                  />
                </div>
              ))}
            </div>
          )}

          {!showSkeleton && recipesList.length === 0 && hasFilters && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件，或者清除所有篩選</p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95"
              >
                清除篩選
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>篩選條件</h2>
              <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {/* 菜系 */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <label className="block text-sm font-semibold mb-3 text-gray-700">🍽️ 菜系</label>
                <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    {cuisineOptions.filter(c => c.value !== '').map(c => (
                      <button
                        key={c.value}
                        onClick={() => setModalCuisine(modalCuisine === c.value ? '' : c.value)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalCuisine === c.value ? 'var(--primary)' : 'var(--background)',
                          color: modalCuisine === c.value ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 時間 */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">⏱️ 烹飪時間</label>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    {timeOptions.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setModalTime(modalTime === t.value ? '' : t.value)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalTime === t.value ? 'var(--primary)' : 'var(--background)',
                          color: modalTime === t.value ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 難度 */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">📊 難度</label>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    {difficultyOptions.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setModalDifficulty(modalDifficulty === d.value ? '' : d.value)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalDifficulty === d.value ? 'var(--primary)' : 'var(--background)',
                          color: modalDifficulty === d.value ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 烹調方式 */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">🍳 烹調方式</label>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    {methodOptions.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setModalMethod(modalMethod === m.value ? '' : m.value)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalMethod === m.value ? 'var(--primary)' : 'var(--background)',
                          color: modalMethod === m.value ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 飲食限制 */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">🥗 飲食/營養</label>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    {dietOptions.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setModalDiet(modalDiet === d.value ? '' : d.value)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalDiet === d.value ? 'var(--primary)' : 'var(--background)',
                          color: modalDiet === d.value ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 排除食材 */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">🚫 排除食材</label>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    {exclusionOptions.map(e => (
                      <button
                        key={e.value}
                        onClick={() => setModalExclusions(modalExclusions === e.value ? '' : e.value)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalExclusions === e.value ? 'var(--primary)' : 'var(--background)',
                          color: modalExclusions === e.value ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 預算 */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-semibold mb-3 text-gray-700">💰 預算</label>
                  <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    {budgetOptions.map(b => (
                      <button
                        key={b.value}
                        onClick={() => setModalBudget(modalBudget === b.value ? '' : b.value)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalBudget === b.value ? 'var(--primary)' : 'var(--background)',
                          color: modalBudget === b.value ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 rounded-xl border font-medium"
                  style={{ borderColor: 'var(--border)' }}
                >
                  清除
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 py-3 rounded-xl text-white font-medium"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  應用篩選
                </button>
              </div>
            </div>
            </div>
          )}
      
      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        recipe={selectedRecipe}
        loading={modalLoading}
      />
    </Layout>
  );
}

export async function getServerSideProps() {
  console.log('[SSR] ====== START ======');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[SSR] 1. Env check:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[SSR] 2. Missing env vars - returning empty');
      return { props: { initialRecipes: [], ssrError: 'Missing env vars' } };
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('[SSR] 3. Client created, executing query...');
    
    // Use simpler query first to debug
    const { data: recipes, error, count } = await supabase
      .from('recipes')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100);
    
    console.log('[SSR] 4. Query executed:', { 
      error: error?.message, 
      count: count,
      recipesLength: recipes?.length,
      errorDetails: JSON.stringify(error)
    });
    
    if (error) {
      console.error('[SSR] 5. Supabase error:', error.message, error.details, error.hint);
      return { props: { initialRecipes: [], ssrError: error.message } };
    }
    
    console.log('[SSR] 6. Success, returning', recipes?.length || 0, 'recipes');
    console.log('[SSR] ====== END ======');
    return { props: { initialRecipes: recipes || [], ssrError: null } };
  } catch (e) {
    console.error('[SSR] 7. Fatal error:', e.message, e.stack);
    return { props: { initialRecipes: [], ssrError: e.message } };
  }
}
