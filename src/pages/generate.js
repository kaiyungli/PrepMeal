'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Header from '@/components/layout/Header';
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
  const [showRecipePicker, setShowRecipePicker] = useState(false);
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
    setWeeklyPlan(prev => ({ ...prev, [dayKey]: recipe }));
    setShowRecipePicker(false);
    setSelectedDay(null);
  };

  const removeRecipeFromDay = (dayKey) => {
    setWeeklyPlan(prev => ({ ...prev, [dayKey]: null }));
  };

  const clearAll = () => {
    setWeeklyPlan(DAYS.reduce((acc, day) => ({ ...acc, [day.key]: null }), {}));
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
        newPlan[day.key] = randomRecipe;
      }
    });
    setWeeklyPlan(newPlan);
  };

  const generateShoppingList = () => {
    const ingredients = {};
    Object.values(weeklyPlan).forEach(recipe => {
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          const name = ing.name || ing.ingredient_id;
          ingredients[name] = (ingredients[name] || 0) + (ing.quantity || 1);
        });
      }
    });
    setShoppingList(Object.entries(ingredients).map(([name, qty]) => ({ name, quantity: qty })));
    setShowShoppingList(true);
  };

  const getDifficultyLabel = (d) => ({ easy: '易', medium: '中', hard: '難' }[d] || '中');
  const getSpeedLabel = (s) => ({ quick: '15分鐘', normal: '30分鐘' }[s] || '20分鐘');

  const hasRecipes = Object.values(weeklyPlan).some(r => r !== null);
  const selectedCount = Object.values(weeklyPlan).filter(r => r !== null).length;

  return (
    <>
      <Header />
      <Head><title>今晚食乜 - 一週餐單</title></Head>
      <div style={{ minHeight: '100vh', background: colors.background, fontFamily: 'Inter, sans-serif' }}>
        
        {/* Hero Header */}
        <section style={{ background: colors.primary, padding: '32px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: '900', color: colors.white, marginBottom: '8px' }}>
            🍽️ 一週餐單
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
            為你安排每日晚餐，簡單方便
          </p>
        </section>

        {/* Action Bar */}
        <div style={{ 
          background: colors.white, 
          padding: '16px 24px', 
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
              已選擇 {selectedCount} 日
            </span>
            {hasRecipes && (
              <button
                onClick={clearAll}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: colors.textLight,
                  cursor: 'pointer',
                }}
              >
                🗑️ 清空
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={generateShoppingList}
              disabled={!hasRecipes}
              style={{
                padding: '10px 20px',
                background: hasRecipes ? colors.sage : '#e0e0e0',
                color: colors.text,
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: hasRecipes ? 'pointer' : 'not-allowed',
              }}
            >
              🛒 購物清單
            </button>
            <button
              onClick={handleGenerate}
              disabled={!hasRecipes}
              style={{
                padding: '10px 20px',
                background: hasRecipes ? colors.accent : '#e0e0e0',
                color: colors.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: hasRecipes ? 'pointer' : 'not-allowed',
              }}
            >
              ✨ 一鍵生成
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '0 24px' 
        }}>
          <div style={{ 
            background: colors.white, 
            borderRadius: '16px', 
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <h3 style={{ fontWeight: '700', marginBottom: '16px', color: colors.text, fontSize: '16px' }}>
              🔍 選擇要求生成餐單
            </h3>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: colors.textLight, marginBottom: '6px', display: 'block' }}>
                  🥢 菜系
                </label>
                <select 
                  value={cuisine} 
                  onChange={(e) => setCuisine(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', minWidth: '120px' }}
                >
                  {cuisineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: colors.textLight, marginBottom: '6px', display: 'block' }}>
                  ⏱️ 時間
                </label>
                <select 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', minWidth: '120px' }}
                >
                  {timeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: colors.textLight, marginBottom: '6px', display: 'block' }}>
                  💪 難度
                </label>
                <select 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', minWidth: '120px' }}
                >
                  {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Meal Plan Grid */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px' 
          }}>
            {DAYS.map(day => (
              <div 
                key={day.key}
                style={{
                  background: colors.white,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* Day Header */}
                <div style={{ 
                  background: day.key === 'sat' || day.key === 'sun' ? colors.sage : colors.primary,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ color: colors.white, fontWeight: '700', fontSize: '15px' }}>
                      {day.label}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                      {day.date}
                    </div>
                  </div>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.white,
                    fontWeight: '700',
                    fontSize: '14px',
                  }}>
                    {day.short}
                  </div>
                </div>

                {/* Recipe Slot */}
                <div style={{ padding: '16px', minHeight: '120px' }}>
                  {weeklyPlan[day.key] ? (
                    <div style={{ position: 'relative' }}>
                      <div style={{ 
                        background: colors.background, 
                        borderRadius: '12px', 
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}>
                        <div style={{ 
                          height: '80px', 
                          position: 'relative',
                          background: colors.sage + '30'
                        }}>
                          {weeklyPlan[day.key].image_url ? (
                            <Image 
                              src={weeklyPlan[day.key].image_url} 
                              alt={weeklyPlan[day.key].name} 
                              fill 
                              style={{ objectFit: 'cover' }} 
                            />
                          ) : (
                            <div style={{ 
                              width: '100%', 
                              height: '100%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '32px'
                            }}>
                              🍳
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '10px' }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: colors.text, marginBottom: '4px' }}>
                            {weeklyPlan[day.key].name}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: colors.textLight }}>
                              ⏱️ {getSpeedLabel(weeklyPlan[day.key].speed)}
                            </span>
                            <span style={{ fontSize: '11px', color: colors.textLight }}>
                              {getDifficultyLabel(weeklyPlan[day.key].difficulty)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRecipeFromDay(day.key)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '28px',
                          height: '28px',
                          background: 'rgba(255,255,255,0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
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
                      style={{
                        width: '100%',
                        padding: '20px',
                        background: colors.background,
                        border: `2px dashed ${colors.border}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: colors.textLight,
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>+</span>
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
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '20px',
          }} onClick={() => setShowRecipePicker(false)}>
            <div style={{
              background: colors.white,
              borderRadius: '20px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }} onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{ 
                padding: '20px 24px', 
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: colors.primary }}>
                  選擇食譜 - {DAYS.find(d => d.key === selectedDay)?.label}
                </h2>
                <button
                  onClick={() => setShowRecipePicker(false)}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: colors.background,
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Filters */}
              <div style={{ 
                padding: '16px 24px', 
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <select 
                  value={cuisine}
                  onChange={e => setCuisine(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: colors.white,
                    color: colors.text,
                  }}
                >
                  {cuisineOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === '全部' ? '🥢 全部菜系' : opt}</option>
                  ))}
                </select>
                <select 
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: colors.white,
                    color: colors.text,
                  }}
                >
                  {timeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === '全部' ? '⏱️ 全部時間' : opt}</option>
                  ))}
                </select>
                <select 
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: colors.white,
                    color: colors.text,
                  }}
                >
                  {difficultyOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === '全部' ? '💪 全部難度' : opt}</option>
                  ))}
                </select>
              </div>

              {/* Recipe List */}
              <div style={{ 
                padding: '20px', 
                overflow: 'auto',
                flex: 1,
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '12px' 
                }}>
                  {filteredRecipes.map(recipe => (
                    <div
                      key={recipe.id}
                      onClick={() => addRecipeToDay(selectedDay, recipe)}
                      style={{
                        background: colors.background,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <div style={{ height: '100px', position: 'relative', background: colors.sage + '30' }}>
                        {recipe.image_url ? (
                          <Image src={recipe.image_url} alt={recipe.name} fill style={{ objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                            🍳
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: colors.text, marginBottom: '4px' }}>
                          {recipe.name}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: colors.textLight }}>
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
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }} onClick={() => setShowShoppingList(false)}>
            <div style={{
              background: colors.white,
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.primary, marginBottom: '20px' }}>
                🛒 購物清單
              </h2>
              {shoppingList.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {shoppingList.map((item, i) => (
                    <li key={i} style={{ 
                      padding: '12px 0', 
                      borderBottom: `1px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ color: colors.text }}>{item.name}</span>
                      <span style={{ color: colors.textLight }}>x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: colors.textLight, textAlign: 'center', padding: '20px' }}>
                  選擇食譜以生成購物清單
                </p>
              )}
              <button
                onClick={() => setShowShoppingList(false)}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '14px',
                  background: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
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
