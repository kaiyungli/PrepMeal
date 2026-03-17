'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';

// Filter options
const cuisineOptions = ['全部', '中式', '日式', '韓式', '西式', '台式', '東南亞'];
const timeOptions = ['全部', '15分鐘內', '30分鐘內', '45分鐘內', '60分鐘內'];
const difficultyOptions = ['全部', '簡易', '中等', '困難'];
const methodOptions = ['全部', '炒', '蒸', '煮', '焗', '煎', '燉', '氣炸'];
const dietOptions = ['全部', '素食', '蛋奶素', '高蛋白', '低脂', '低卡'];
const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'popular', label: '最受歡迎' },
  { value: 'quick', label: '最快完成' },
  { value: 'fewest_ingredients', label: '最少食材' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_budget', label: '低預算' },
];

export default function Home({ initialRecipes }) {
  const [recipes, setRecipes] = useState(initialRecipes || []);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Filter states
  const [pantryInput, setPantryInput] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('全部');
  const [selectedTime, setSelectedTime] = useState('全部');
  const [selectedDifficulty, setSelectedDifficulty] = useState('全部');
  const [selectedMethod, setSelectedMethod] = useState('全部');
  const [selectedDiet, setSelectedDiet] = useState('全部');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch recipes with filters
  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCuisine !== '全部') params.set('cuisine', selectedCuisine);
      if (selectedTime !== '全部') params.set('maxTime', selectedTime.replace('分鐘內', ''));
      if (selectedDifficulty !== '全部') params.set('difficulty', selectedDifficulty);
      if (selectedMethod !== '全部') params.set('method', selectedMethod);
      if (selectedDiet !== '全部') params.set('diet', selectedDiet);
      params.set('sort', sortBy);
      
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
  }, [selectedCuisine, selectedTime, selectedDifficulty, selectedMethod, selectedDiet, sortBy]);

  const handleSearch = () => {
    fetchRecipes();
  };

  const handlePantrySearch = () => {
    // Navigate to generate page with pantry ingredients
    const ingredients = pantryInput.split(',').map(s => s.trim()).filter(Boolean);
    if (ingredients.length > 0) {
      window.location.href = `/generate?pantry=${encodeURIComponent(ingredients.join(','))}`;
    } else {
      window.location.href = '/generate';
    }
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

  const getDifficultyLabel = (d) => {
    const map = { easy: '簡易', medium: '中等', hard: '困難' };
    return map[d] || d;
  };

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

      {/* Clean Hero */}
      <section className="py-12" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ color: 'var(--foreground)' }}>
            今晚食乜?
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--muted-foreground)' }}>
            搜尋食譜 · 生成餐單 · 輕鬆煮飯
          </p>

          {/* Ingredient Input */}
          <div className="flex gap-2 max-w-xl mx-auto mb-6">
            <input
              type="text"
              value={pantryInput}
              onChange={(e) => setPantryInput(e.target.value)}
              placeholder="有咩食材？例如：蛋、番茄、雞肉"
              className="flex-1 px-4 py-3 rounded-xl border"
              style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
              onKeyDown={(e) => e.key === 'Enter' && handlePantrySearch()}
            />
            <button
              onClick={handlePantrySearch}
              className="px-6 py-3 rounded-xl text-white font-medium"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              用食材搵食譜
            </button>
          </div>

          {/* Two Main Actions */}
          <div className="flex gap-4 justify-center">
            <a
              href="/recipes"
              className="px-8 py-3 rounded-xl font-medium"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }}
            >
              🔍 搵食譜
            </a>
            <a
              href="/generate"
              className="px-8 py-3 rounded-xl text-white font-medium"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              📅 生成餐單
            </a>
          </div>
        </div>
      </section>

      {/* Recipe Listing with Filters */}
      <section className="py-8" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                {recipes.length} 個食譜
              </span>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-3">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜尋食譜..."
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)' }}
              />

              {/* Cuisine */}
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {cuisineOptions.map(c => <option key={c} value={c}>{c === '全部' ? '全部菜系' : c}</option>)}
              </select>

              {/* Time */}
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {timeOptions.map(t => <option key={t} value={t}>{t === '全部' ? '全部時間' : t}</option>)}
              </select>

              {/* Difficulty */}
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {difficultyOptions.map(d => <option key={d} value={d}>{d === '全部' ? '全部難度' : d}</option>)}
              </select>

              {/* Method */}
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {methodOptions.map(m => <option key={m} value={m}>{m === '全部' ? '全部烹調' : m}</option>)}
              </select>

              {/* Diet */}
              <select
                value={selectedDiet}
                onChange={(e) => setSelectedDiet(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {dietOptions.map(d => <option key={d} value={d}>{d === '全部' ? '全部飲食' : d}</option>)}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border)' }}
            >
              全部篩選
            </button>
          </div>

          {/* Mobile Filters Drawer */}
          {showMobileFilters && (
            <div className="md:hidden mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--background)' }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">搜尋</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋食譜..."
                    className="w-full px-3 py-2 rounded-lg border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">菜系</label>
                  <div className="flex flex-wrap gap-2">
                    {cuisineOptions.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCuisine(c)}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: selectedCuisine === c ? 'var(--primary)' : 'var(--background)',
                          color: selectedCuisine === c ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">時間</label>
                  <div className="flex flex-wrap gap-2">
                    {timeOptions.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: selectedTime === t ? 'var(--primary)' : 'var(--background)',
                          color: selectedTime === t ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">難度</label>
                  <div className="flex flex-wrap gap-2">
                    {difficultyOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => setSelectedDifficulty(d)}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: selectedDifficulty === d ? 'var(--primary)' : 'var(--background)',
                          color: selectedDifficulty === d ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">烹調方式</label>
                  <div className="flex flex-wrap gap-2">
                    {methodOptions.map(m => (
                      <button
                        key={m}
                        onClick={() => setSelectedMethod(m)}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: selectedMethod === m ? 'var(--primary)' : 'var(--background)',
                          color: selectedMethod === m ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">飲食限制</label>
                  <div className="flex flex-wrap gap-2">
                    {dietOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => setSelectedDiet(d)}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: selectedDiet === d ? 'var(--primary)' : 'var(--background)',
                          color: selectedDiet === d ? 'white' : 'var(--foreground)'
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { handleSearch(); setShowMobileFilters(false); }}
                  className="w-full py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  應用篩選
                </button>
              </div>
            </div>
          )}

          {/* Recipe Grid */}
          {loading ? (
            <div className="text-center py-12">載入中...</div>
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
            <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>
              沒有找到符合條件的食譜
            </div>
          )}
        </div>
      </section>

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
