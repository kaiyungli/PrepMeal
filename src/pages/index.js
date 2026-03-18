'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { FilterChip, FilterSection, RecipeFilterPanel } from '@/components/filters';

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
const cuisineOptions = [
  { label: '全部', value: '' },
  { label: '中式', value: 'chinese' },
  { label: '西式', value: 'western' },
];
const timeOptions = [
  { label: '15分鐘內', value: '15' },
  { label: '30分鐘內', value: '30' },
  { label: '45分鐘內', value: '45' },
  { label: '60分鐘內', value: '60' },
];
const difficultyOptions = [
  { label: '簡易', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困難', value: 'hard' },
];
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
const dietOptions = [
  { label: '素食', value: 'vegetarian' },
  { label: '蛋奶素', value: 'egg_lacto' },
  { label: '高蛋白', value: 'high_protein' },
  { label: '低脂', value: 'low_fat' },
  { label: '低卡', value: 'low_calorie' },
  { label: '清淡', value: 'light' },
];

// Exclusions
const exclusionOptions = [
  { label: '不要牛肉', value: 'no_beef' },
  { label: '不要豬肉', value: 'no_pork' },
  { label: '不要雞肉', value: 'no_chicken' },
  { label: '不要海鮮', value: 'no_seafood' },
  { label: '不要蛋', value: 'no_eggs' },
  { label: '不要奶', value: 'no_dairy' },
  { label: '不要辣', value: 'no_spicy' },
];

// Budget
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  
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

      {/* Clean Hero */}
      <section className="py-8" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-black mb-4" style={{ color: 'var(--foreground)' }}>
            今晚食乜?
          </h1>
          <p className="text-xl mb-8" style={{ color: 'var(--muted-foreground)' }}>
            輸入你有嘅食材，我帮你搵啱啱嘅食譜
          </p>

          {/* Ingredient Input - Primary Action */}
          <div className="flex gap-2 max-w-lg mx-auto mb-6">
            <input
              type="text"
              value={pantryInput}
              onChange={(e) => setPantryInput(e.target.value)}
              placeholder="例如：蛋、番茄、雞肉..."
              className="flex-1 px-5 py-4 rounded-2xl border-2 text-lg"
              style={{ borderColor: 'var(--primary)', backgroundColor: 'white' }}
              onKeyDown={(e) => e.key === 'Enter' && handlePantrySearch()}
            />
            <button
              onClick={handlePantrySearch}
              className="px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-lg"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              搵食譜
            </button>
          </div>

          {/* Secondary Action */}
          <div>
            <a
              href="/generate"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }}
            >
              📅 生成一週餐單
            </a>
          </div>
        </div>
      </section>

      {/* Recipe Listing - Sidebar + Grid Layout */}
      <section className="py-6" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-4">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <button 
              onClick={() => setShowFilterModal(true)}
              className="w-full py-3 rounded-xl border font-medium flex items-center justify-center gap-2"
              style={{ borderColor: hasFilters ? 'var(--primary)' : 'var(--border)' }}
            >
              <span>🔍</span>
              <span>{hasFilters ? '已套用篩選' : '篩選'}</span>
              {hasFilters && <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs">✓</span>}
            </button>
          </div>

{/* Desktop: Stacked Filter Sections - Like Generate Page */}
          <div className="hidden lg:block mb-6 pb-4 border-b">
            {/* Primary Filters Row - Like Generate Page */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* 菜系 */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{color: '#7A746B'}}>菜系</span>
                <div className="flex flex-wrap gap-1">
                  {cuisineOptions.filter(c => c.value !== '').map(c => (
                    <button
                      key={c.value}
                      onClick={() => toggleFilter(modalCuisine, c.value, setModalCuisine)}
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: modalCuisine.includes(c.value) ? '#9B6035' : 'white',
                        color: modalCuisine.includes(c.value) ? 'white' : '#3A2010',
                        border: '1px solid #E7E0D4'
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 時間 */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{color: '#7A746B'}}>烹飪時間</span>
                <div className="flex flex-wrap gap-1">
                  {timeOptions.map(t => (
                    <button
                      key={t.value}
                      onClick={() => toggleFilter(modalTime, t.value, setModalTime)}
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: modalTime.includes(t.value) ? '#9B6035' : 'white',
                        color: modalTime.includes(t.value) ? 'white' : '#3A2010',
                        border: '1px solid #E7E0D4'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 難度 */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{color: '#7A746B'}}>難度</span>
                <div className="flex flex-wrap gap-1">
                  {difficultyOptions.map(d => (
                    <button
                      key={d.value}
                      onClick={() => toggleFilter(modalDifficulty, d.value, setModalDifficulty)}
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: modalDifficulty.includes(d.value) ? '#9B6035' : 'white',
                        color: modalDifficulty.includes(d.value) ? 'white' : '#3A2010',
                        border: '1px solid #E7E0D4'
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 更多篩選 Toggle */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{color: '#7A746B'}}>更多篩選</span>
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: showAdvanced ? '#9B6035' : 'white',
                    color: showAdvanced ? 'white' : '#3A2010',
                    border: '1px solid #E7E0D4'
                  }}
                >
                  {showAdvanced ? '▲ 收起' : '▼ 更多'}
                </button>
              </div>
            </div>

            {/* Clear button */}
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs font-medium mt-3" style={{color: '#9B6035'}}>
                清除全部
              </button>
            )}
          </div>

          {/* Advanced Filters - Using FilterSection */}
          {showAdvanced && (
            <div className="mb-4 p-4 rounded-xl" style={{backgroundColor: '#F8F3E8'}}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FilterSection title="烹調方式" options={methodOptions} selected={modalMethod} onToggle={(v) => toggleFilter(modalMethod, v, setModalMethod)} />
                <FilterSection title="飲食偏好" options={dietOptions} selected={modalDiet} onToggle={(v) => toggleFilter(modalDiet, v, setModalDiet)} />
                <FilterSection title="排除項目" options={exclusionOptions.slice(0, 4)} selected={modalExclusions} onToggle={(v) => toggleFilter(modalExclusions, v, setModalExclusions)} variant="danger" />
              </div>
            </div>
          )}

            {hasFilters && modalCuisine.length > 0 && (
              <button 
                onClick={clearFilters} 
                className="text-sm text-red-500 hover:text-red-600 ml-auto"
              >
                清除篩選
              </button>
            )}
          </div>

            <div className="flex-1">
              {/* Header Row */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{recipeCountText}</h2>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">排序：</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 rounded-full border text-sm font-medium"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Active Filters - shown when filters active */}
              {hasFilters && modalCuisine.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {modalCuisine.map(v => (
                    <span key={v} className="px-2 py-0.5 rounded-full bg-primary text-white text-xs">
                      {cuisineOptions.find(c => c.value === v)?.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

          {/* Recipe Grid */}
          {showSkeleton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-xl h-48 mb-3"></div>
                  <div className="bg-gray-200 h-5 rounded w-3/4 mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {!showSkeleton && recipesList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipesList.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleRecipeClick(recipe)}
                />
              ))}
            </div>
          )}

          {!showSkeleton && recipesList.length === 0 && hasFilters && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🥘</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                搵唔到啱啱嘅食譜
              </h3>
              <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>
                試下調整篩選條件，或者清除所有篩選
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 rounded-full text-white font-medium"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                清除篩選
              </button>
            </div>
          )}
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
                <div className="flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-2">
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
      .limit(20);
    
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
