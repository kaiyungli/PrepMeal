'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';

// Quick filter chips
const QUICK_FILTERS = [
  { id: 'quick', label: '⚡ 15分鐘', value: '15' },
  { id: 'easy', label: '😊 簡易', value: 'easy' },
  { id: 'protein', label: '💪 高蛋白', value: 'protein' },
  { id: 'vegetarian', label: '🥬 素食', value: 'vegetarian' },
  { id: 'lowcal', label: '🔥 低卡', value: 'lowcal' },
];

const cuisineOptions = ['全部', '中式', '日式', '韓式', '西式', '台式', '東南亞'];
const timeOptions = ['15分鐘內', '30分鐘內', '45分鐘內', '60分鐘內'];
const difficultyOptions = ['簡易', '中等', '困難'];
const methodOptions = ['炒', '蒸', '煮', '焗', '煎', '燉', '氣炸'];
const dietOptions = ['素食', '蛋奶素', '高蛋白', '低脂', '低卡'];

const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'popular', label: '最受歡迎' },
  { value: 'quick', label: '最快完成' },
  { value: 'high_protein', label: '高蛋白' },
];

export default function Home({ initialRecipes }) {
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
  
  // Filter modal states
  const [modalCuisine, setModalCuisine] = useState('全部');
  const [modalTime, setModalTime] = useState('全部');
  const [modalDifficulty, setModalDifficulty] = useState('全部');
  const [modalMethod, setModalMethod] = useState('全部');
  const [modalDiet, setModalDiet] = useState('全部');

  // Fetch recipes with filters
  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (activeFilters.includes('15')) params.set('maxTime', '15');
      if (activeFilters.includes('easy')) params.set('difficulty', 'easy');
      if (activeFilters.includes('protein')) params.set('sort', 'high_protein');
      if (activeFilters.includes('vegetarian')) params.set('diet', 'vegetarian');
      if (activeFilters.includes('lowcal')) params.set('sort', 'low_calorie');
      if (modalCuisine !== '全部') params.set('cuisine', modalCuisine);
      if (modalTime !== '全部') params.set('maxTime', modalTime.replace('分鐘內', ''));
      if (modalDifficulty !== '全部') params.set('difficulty', modalDifficulty);
      if (modalMethod !== '全部') params.set('method', modalMethod);
      if (modalDiet !== '全部') params.set('diet', modalDiet);
      if (sortBy !== 'newest' && !activeFilters.includes('protein') && !activeFilters.includes('lowcal')) params.set('sort', sortBy);
      
      const res = await fetch(`/api/recipes?${params}`);
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [activeFilters, sortBy]);

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
    setModalCuisine('全部');
    setModalTime('全部');
    setModalDifficulty('全部');
    setModalMethod('全部');
    setModalDiet('全部');
    setSortBy('newest');
    fetchRecipes();
  };

  const hasActiveFilters = activeFilters.length > 0 || 
    modalCuisine !== '全部' || 
    modalTime !== '全部' || 
    modalDifficulty !== '全部' ||
    modalMethod !== '全部' ||
    modalDiet !== '全部';

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

      {/* Clean Hero */}
      <section className="py-16" style={{ backgroundColor: 'var(--background)' }}>
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

      {/* Recipe Listing */}
      <section className="py-8" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>快速篩選：</span>
            {QUICK_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => handleQuickFilter(filter.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeFilters.includes(filter.id) ? 'var(--primary)' : 'var(--background)',
                  color: activeFilters.includes(filter.id) ? 'white' : 'var(--foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                {filter.label}
              </button>
            ))}
            
            <div className="flex-1" />
            
            {/* Sort & Filter Buttons */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-full border text-sm font-medium"
              style={{ borderColor: 'var(--border)' }}
            >
              {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            
            <button
              onClick={() => setShowFilterModal(true)}
              className="px-4 py-2 rounded-full border text-sm font-medium"
              style={{ 
                borderColor: hasActiveFilters ? 'var(--primary)' : 'var(--border)',
                backgroundColor: hasActiveFilters ? 'var(--primary)' : 'transparent',
                color: hasActiveFilters ? 'white' : 'var(--foreground)'
              }}
            >
              篩選 {hasActiveFilters && '✓'}
            </button>
          </div>

          {/* Result Count */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              {loading ? '載入中...' : `${recipes.length} 個食譜`}
            </h2>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-sm font-medium"
                style={{ color: 'var(--primary)' }}
              >
                清除篩選
              </button>
            )}
          </div>

          {/* Recipe Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-xl h-48 mb-3"></div>
                  <div className="bg-gray-200 h-5 rounded w-3/4 mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleRecipeClick(recipe)}
                />
              ))}
            </div>
          ) : (
            /* Friendly Empty State */
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
        </div>
      </section>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>篩選</h2>
                <button onClick={() => setShowFilterModal(false)} className="text-2xl">&times;</button>
              </div>
              
              <div className="space-y-5">
                {/* 菜系 */}
                <div>
                  <label className="block text-sm font-medium mb-2">菜系</label>
                  <div className="flex flex-wrap gap-2">
                    {cuisineOptions.filter(c => c !== '全部').map(c => (
                      <button
                        key={c}
                        onClick={() => setModalCuisine(modalCuisine === c ? '全部' : c)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalCuisine === c ? 'var(--primary)' : 'var(--background)',
                          color: modalCuisine === c ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 時間 */}
                <div>
                  <label className="block text-sm font-medium mb-2">烹飪時間</label>
                  <div className="flex flex-wrap gap-2">
                    {timeOptions.map(t => (
                      <button
                        key={t}
                        onClick={() => setModalTime(modalTime === t ? '全部' : t)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalTime === t ? 'var(--primary)' : 'var(--background)',
                          color: modalTime === t ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 難度 */}
                <div>
                  <label className="block text-sm font-medium mb-2">難度</label>
                  <div className="flex flex-wrap gap-2">
                    {difficultyOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => setModalDifficulty(modalDifficulty === d ? '全部' : d)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalDifficulty === d ? 'var(--primary)' : 'var(--background)',
                          color: modalDifficulty === d ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 烹調方式 */}
                <div>
                  <label className="block text-sm font-medium mb-2">烹調方式</label>
                  <div className="flex flex-wrap gap-2">
                    {methodOptions.map(m => (
                      <button
                        key={m}
                        onClick={() => setModalMethod(modalMethod === m ? '全部' : m)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalMethod === m ? 'var(--primary)' : 'var(--background)',
                          color: modalMethod === m ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 飲食限制 */}
                <div>
                  <label className="block text-sm font-medium mb-2">飲食限制</label>
                  <div className="flex flex-wrap gap-2">
                    {dietOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => setModalDiet(modalDiet === d ? '全部' : d)}
                        className="px-3 py-1.5 rounded-full text-sm"
                        style={{
                          backgroundColor: modalDiet === d ? 'var(--primary)' : 'var(--background)',
                          color: modalDiet === d ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {d}
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
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id,name,slug,description,image_url,cuisine,dish_type,method,speed,difficulty,calories_per_serving,prep_time,cook_time')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);
    return { props: { initialRecipes: recipes || [] } };
  } catch (e) {
    return { props: { initialRecipes: [] } };
  }
}
