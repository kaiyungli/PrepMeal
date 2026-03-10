'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
//
import Footer from '@/components/layout/Footer';

const colors = {
  background: '#F8F3E8',
  primary: '#9B6035',
  secondary: '#C8D49A',
  accent: '#F0A060',
  text: '#3A2010',
  textLight: '#AA7A50',
  cream: '#F8F3E8',
  sage: '#C8D49A',
  brown: '#9B6035',
  yellow: '#F0A060',
  footer: '#2A1A08',
  white: '#FFFFFF',
  border: '#DDD0B0',
};

// Days of the week with dates
const DAYS = [
  { key: 'mon', label: '星期一', short: '一', date: '3月2日' },
  { key: 'tue', label: '星期二', short: '二', date: '3月3日' },
  { key: 'wed', label: '星期三', short: '三', date: '3月4日' },
  { key: 'thu', label: '星期四', short: '四', date: '3月5日' },
  { key: 'fri', label: '星期五', short: '五', date: '3月6日' },
  { key: 'sat', label: '星期六', short: '六', date: '3月7日' },
  { key: 'sun', label: '星期日', short: '日', date: '3月8日' },
];

const cuisineOptions = ['全部', '中式', '日式', '韓式', '西式', '素食'];
const timeOptions = ['全部', '15分鐘', '30分鐘'];
const difficultyOptions = ['全部', '易', '中', '難'];

export default function GeneratePage() {
  const router = useRouter();
  const [allRecipes, setAllRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [cuisine, setCuisine] = useState('全部');
  const [time, setTime] = useState('全部');
  const [difficulty, setDifficulty] = useState('全部');
  const [servings, setServings] = useState(2);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  // removed selectedRecipe
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Weekly meal plan - each day has optional recipe
  const [weeklyPlan, setWeeklyPlan] = useState(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: null }), {})
  );

  // Shopping list
  const [shoppingList, setShoppingList] = useState([]);
  const [showShoppingList, setShowShoppingList] = useState(false);

  useEffect(() => {
    fetch('/api/recipes?limit=50')
      .then(res => res.json())
      .then(data => {
        const recipes = data.recipes || [];
        setAllRecipes(recipes);
        setFilteredRecipes(recipes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let filtered = [...allRecipes];
    if (cuisine !== '全部') filtered = filtered.filter(r => r.cuisine === cuisine);
    if (time !== '全部') {
      const isQuick = time === '15分鐘';
      filtered = filtered.filter(r => r.speed === (isQuick ? 'quick' : 'normal'));
    }
    if (difficulty !== '全部') filtered = filtered.filter(r => r.difficulty === difficulty);
    setFilteredRecipes(filtered.length > 0 ? filtered : allRecipes);
  }, [cuisine, time, difficulty, allRecipes]);

  const addRecipeToDay = (dayKey, recipe) => {
    setWeeklyPlan(prev => ({ ...prev, [dayKey]: [...(prev[dayKey] || []), recipe] }));
    setShowRecipePicker(false);
    setSelectedDay(null);
  };

  const removeRecipeFromDay = (dayKey, recipeIndex) => {
    setWeeklyPlan(prev => ({ ...prev, [dayKey]: prev[dayKey]?.filter((_, idx) => idx !== recipeIndex) || [] }));
  };

  const randomizeRecipe = (dayKey) => {
    if (filteredRecipes.length === 0) return;
    const random = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
    setWeeklyPlan(prev => ({ ...prev, [dayKey]: [random] }));
  };

  const clearAll = () => {
    setWeeklyPlan(DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}));
  };

  // Generate random meal plan for the week
  const handleGenerate = () => {
    const newPlan = {};
    DAYS.forEach(day => {
      // Filter available recipes
      let available = [...allRecipes];
      if (cuisine !== '全部') {
        available = available.filter(r => r.cuisine === cuisine);
      }
      if (time !== '全部') {
        const isQuick = time === '15分鐘';
        available = available.filter(r => r.speed === (isQuick ? 'quick' : 'normal'));
      }
      if (difficulty !== '全部') {
        available = available.filter(r => r.difficulty === difficulty);
      }
      // Random pick
      if (available.length > 0) {
        const randomRecipe = available[Math.floor(Math.random() * available.length)];
        newPlan[day.key] = [randomRecipe];
      }
    });
    setWeeklyPlan(newPlan);
  };

  const generateShoppingList = () => {
    const ingredients = {};
    Object.values(weeklyPlan).forEach(recipeOrArray => {
      const recipes = Array.isArray(recipeOrArray) ? recipeOrArray : [recipeOrArray];
      recipes.forEach(recipe => {
        if (recipe && recipe.ingredients) {
          recipe.ingredients.forEach(ing => {
            const name = ing.name || ing.ingredient_id;
            ingredients[name] = (ingredients[name] || 0) + (ing.quantity || 1);
          });
        }
      });
    });
    setShoppingList(Object.entries(ingredients).map(([name, qty]) => ({ name, quantity: qty })));
    setShowShoppingList(true);
  };

  const getDifficultyLabel = (d) => ({ easy: '易', medium: '中', hard: '難' }[d] || '中');
  const getSpeedLabel = (s) => ({ quick: '15分鐘', normal: '30分鐘' }[s] || '20分鐘');

  const hasRecipes = Object.values(weeklyPlan).some(arr => Array.isArray(arr) && arr.length > 0);
  const selectedCount = Object.values(weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  return (
    <>
      <Header />
      <Head><title>今晚食乜 - 一週餐單</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] font-['Inter,sans-serif']">
        
        {/* Hero Header */}
        <section className='bg-[#9B6035] px-6 py-8 text-center'>
          <h1 className='text-[clamp(1.5rem,4vw,2.5rem)] font-black text-white mb-2'>
            🍽️ 一週餐單
          </h1>
          <p className='text-white/80 text-base'>
            為你安排每日晚餐，簡單方便
          </p>
        </section>

        {/* Action Bar */}
        <div className="bg-white px-6 py-4 border-b border-[#DDD0B0] flex flex-wrap justify-between items-center gap-3">
          <div className='flex gap-2 items-center'>
            <span className='text-sm font-semibold text-[#3A2010]'>
              已選擇 {selectedCount} 日
            </span>
            {hasRecipes && (
              <button
                onClick={clearAll}
                className="px-3 py-1.5 bg-transparent border border-[#DDD0B0] rounded-md text-xs text-[#AA7A50] cursor-pointer"
                >
                🗑️ 清空
              </button>
            )}
          </div>
          <div className='flex gap-2'>
            <button
              onClick={generateShoppingList}
              disabled={!hasRecipes}
              className="px-5 py-2.5 bg-[#C8D49A] text-[#3A2010] border-none rounded-lg text-sm font-semibold cursor-pointer"
            >
              🛒 購物清單
            </button>
            <button
              onClick={handleGenerate}
              disabled={!allRecipes || allRecipes.length === 0}
              className="px-5 py-2.5 bg-[#F0A060] text-white border-none rounded-lg text-sm font-semibold cursor-pointer"
            >
              ✨ 一鍵生成
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="bg-white rounded-xl p-5 mb-6 shadow-sm">
            <h3 className='font-bold mb-4 text-[#3A2010] text-base'>
              🔍 選擇要求生成餐單
            </h3>
            
            <div className='flex gap-4 flex-wrap'>
              <div>
                <label className='text-[13px] font-semibold text-[#AA7A50] mb-1.5 block'>
                  🥢 菜系
                </label>
                <select 
                  value={cuisine} 
                  onChange={(e) => setCuisine(e.target.value)}
                  className='px-3 py-2 rounded-lg border border-gray-200 text-sm min-w-[120px]'
                >
                  {cuisineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className='text-[13px] font-semibold text-[#AA7A50] mb-1.5 block'>
                  ⏱️ 時間
                </label>
                <select 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)}
                  className='px-3 py-2 rounded-lg border border-gray-200 text-sm min-w-[120px]'
                >
                  {timeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className='text-[13px] font-semibold text-[#AA7A50] mb-1.5 block'>
                  💪 難度
                </label>
                <select 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  className='px-3 py-2 rounded-lg border border-gray-200 text-sm min-w-[120px]'
                >
                  {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className='text-[13px] font-semibold text-[#AA7A50] mb-1.5 block'>
                  👥 人數
                </label>
                <select 
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className='px-3 py-2 rounded-lg border border-gray-200 text-sm min-w-[120px]'
                >
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}人</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Meal Plan Grid */}
        <div className='max-w-[1400px] mx-auto p-6'>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            {DAYS.map(day => (
              <div 
                key={day.key}
                className="bg-white rounded-xl overflow-hidden shadow-sm"
              >
                {/* Day Header */}
                <div className="px-4 py-3 flex justify-between items-center" style={{ background: day.key === 'sat' || day.key === 'sun' ? '#C8D49A' : '#9B6035' }}>
                  <div>
                    <div className='text-white font-bold text-[15px]'>
                      {day.label}
                    </div>
                    <div className='text-white/80 text-xs'>
                      {day.date}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {day.short}
                  </div>
                </div>

                {/* Recipe Slot */}
                <div className='p-4 min-h-[120px]'>
                  {weeklyPlan[day.key]?.length > 0 ? (
                    <div className='relative'>
                      <div 
                        className="bg-[#F8F3E8] rounded-lg overflow-hidden mb-2 cursor-pointer"
                        onClick={() => router.push(`/recipes/${weeklyPlan[day.key][0].id}`)}
                      >
                        <div className="h-20 relative" style={{ background: 'rgba(200,212,154,0.3)' }}>
                          {weeklyPlan[day.key][0].image_url ? (
                            <Image 
                              src={weeklyPlan[day.key][0].image_url} 
                              alt={weeklyPlan[day.key][0].name} 
                              fill 
                              className='object-cover' 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">
                              🍳
                            </div>
                          )}
                        </div>
                        <div className='p-2.5'>
                          <div className='font-semibold text-sm text-[#3A2010] mb-1'>
                            {weeklyPlan[day.key]?.[0]?.name}
                          </div>
                          <div className='flex gap-1.5'>
                            <span className='text-[11px] text-[#AA7A50]'>
                              ⏱️ {getSpeedLabel(weeklyPlan[day.key][0].speed)}
                            </span>
                            <span className='text-[11px] text-[#AA7A50]'>
                              {getDifficultyLabel(weeklyPlan[day.key][0].difficulty)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRecipeFromDay(day.key, 0)}
                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 border-none rounded-full cursor-pointer flex items-center justify-center text-sm shadow-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDay(day.key);
                        setShowRecipePicker(true);
                      }}
                      className="w-full p-5 bg-[#F8F3E8] border-2 border-dashed border-[#DDD0B0] rounded-lg cursor-pointer flex flex-col items-center justify-center gap-2 text-[#AA7A50] text-sm"
                    >
                      <span className='text-2xl'>+</span>
                      <span>加入食譜</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recipe Picker Modal */}
        {showRecipePicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-5" onClick={() => setShowRecipePicker(false)}>
            <div className="bg-white rounded-2xl max-w-[900px] w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-[#DDD0B0] flex justify-between items-center">
                <h2 className='text-lg font-bold text-[#9B6035]'>
                  選擇食譜 - {DAYS.find(d => d.key === selectedDay)?.label}
                </h2>
                <button
                  onClick={() => setShowRecipePicker(false)}
                  className="w-9 h-9 bg-[#F8F3E8] border-none rounded-full cursor-pointer text-lg flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Filters */}
              <div className="px-6 py-4 border-b border-[#DDD0B0] flex flex-wrap gap-3">
                <select 
                  value={cuisine}
                  onChange={e => setCuisine(e.target.value)}
                  className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-sm bg-white text-[#3A2010]"
                >
                  {cuisineOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === '全部' ? '🥢 全部菜系' : opt}</option>
                  ))}
                </select>
                <select 
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-sm bg-white text-[#3A2010]"
                >
                  {timeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === '全部' ? '⏱️ 全部時間' : opt}</option>
                  ))}
                </select>
                <select 
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-sm bg-white text-[#3A2010]"
                >
                  {difficultyOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === '全部' ? '💪 全部難度' : opt}</option>
                  ))}
                </select>
              </div>

              {/* Recipe List */}
              <div className="p-5 overflow-auto flex-1">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  {filteredRecipes.map(recipe => (
                    <div
                      key={recipe.id}
                      onClick={() => addRecipeToDay(selectedDay, recipe)}
                      className="bg-[#F8F3E8] rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
                    >
                      <div className="h-[100px] relative bg-[#C8D49A]/30">
                        {recipe.image_url ? (
                          <Image src={recipe.image_url} alt={recipe.name} fill className='object-cover' />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-3xl'>
                            🍳
                          </div>
                        )}
                      </div>
                      <div className='p-2.5'>
                        <div className='font-semibold text-[13px] text-[#3A2010] mb-1'>
                          {recipe.name}
                        </div>
                        <div className='flex gap-1.5 text-[11px] text-[#AA7A50]'>
                          <span>⏱️ {getSpeedLabel(recipe.speed)}</span>
                          <span>{getDifficultyLabel(recipe.difficulty)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Shopping List Modal */}
        {showShoppingList && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" onClick={() => setShowShoppingList(false)}>
            <div className="bg-white rounded-2xl p-8 max-w-[500px] w-[90%] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <h2 className='text-xl font-bold text-[#9B6035] mb-5'>
                🛒 購物清單
              </h2>
              {shoppingList.length > 0 ? (
                <ul className='list-none p-0'>
                  {shoppingList.map((item, i) => (
                    <li key={i} className="py-3 border-b border-[#DDD0B0] flex justify-between">
                      <span className='text-[#3A2010]'>{item.name}</span>
                      <span className='text-[#AA7A50]'>x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-[#AA7A50] text-center p-5'>
                  選擇食譜以生成購物清單
                </p>
              )}
              <button
                onClick={() => setShowShoppingList(false)}
                className="w-full mt-5 py-3.5 bg-[#9B6035] text-white border-none rounded-xl text-base font-semibold cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';
