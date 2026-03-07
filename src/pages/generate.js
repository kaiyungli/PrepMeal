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

const cuisineOptions = ['全部', '中式', '日式', '韓式', '西式', '素食'];
const timeOptions = ['全部', '15分鐘', '30分鐘', '45分鐘'];
const difficultyOptions = ['全部', '易', '中', '難'];
const dishTypeLabels = { main: '主菜', side: '小食' };
const speedLabels = { quick: '快', normal: '中' };
const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

export default function GeneratePage() {
  const router = useRouter();
  const [allRecipes, setAllRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [cuisine, setCuisine] = useState('全部');
  const [time, setTime] = useState('全部');
  const [difficulty, setDifficulty] = useState('全部');
  const [servings, setServings] = useState(2);
  const [selectedRecipes, setSelectedRecipes] = useState({});
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
      const maxTime = time === '15分鐘' ? 15 : time === '30分鐘' ? 30 : 45;
      filtered = filtered.filter(r => r.cooking_time <= maxTime);
    }
    if (difficulty !== '全部') filtered = filtered.filter(r => r.difficulty === difficulty);
    setFilteredRecipes(filtered.length > 0 ? filtered : allRecipes);
  }, [cuisine, time, difficulty, allRecipes]);

  const toggleRecipeSelection = (recipe) => {
    setSelectedRecipes(prev => {
      const newSelected = { ...prev };
      if (newSelected[recipe.id]) {
        delete newSelected[recipe.id];
      } else {
        newSelected[recipe.id] = recipe;
      }
      return newSelected;
    });
  };

  const generateShoppingList = () => {
    const ingredients = {};
    Object.values(selectedRecipes).forEach(recipe => {
      // Mock ingredient data - in real app would fetch from recipe_ingredients
      if (recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          const name = ing.name || ing.ingredient_id;
          ingredients[name] = (ingredients[name] || 0) + (ing.quantity || 1);
        });
      }
    });
    setShoppingList(Object.entries(ingredients).map(([name, qty]) => ({ name, quantity: qty })));
    setShowShoppingList(true);
  };

  const handleGenerate = () => {
    router.push(`/menu?servings=${servings}`);
  };

  const getDifficultyLabel = (d) => ({ easy: '易', medium: '中', hard: '難' }[d] || '中');
  const getSpeedLabel = (s) => ({ quick: '快', normal: '中' }[s] || '中');

  return (
    <>
      <Header />
      <Head><title>今晚食乜 - 生成餐單</title></Head>
      <div style={{ minHeight: '100vh', background: colors.background, fontFamily: 'Inter, sans-serif' }}>
        
        {/* Hero Section */}
        <section style={{ background: colors.primary, padding: '48px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: '900', color: colors.white, marginBottom: '8px' }}>
            生成你既一週餐單
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem' }}>
            選擇你既喜好，我哋幫你安排埋shopping list
          </p>
        </section>

        {/* Filters */}
        <div style={{ background: colors.white, padding: '20px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>🥢 菜系</span>
              {cuisineOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setCuisine(opt)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: cuisine === opt ? colors.primary : colors.background,
                    color: cuisine === opt ? colors.white : colors.text,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>⏱️ 時間</span>
              {timeOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setTime(opt)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: time === opt ? colors.accent : colors.background,
                    color: time === opt ? colors.white : colors.text,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>💪 難度</span>
              {difficultyOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setDifficulty(opt)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: difficulty === opt ? colors.sage : colors.background,
                    color: difficulty === opt ? colors.text : colors.text,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>👥 人數</span>
              {[1, 2, 3, 4].map(opt => (
                <button
                  key={opt}
                  onClick={() => setServings(opt)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: servings === opt ? colors.primary : colors.background,
                    color: servings === opt ? colors.white : colors.text,
                  }}
                >
                  {opt}人
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Recipe Grid */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.primary, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              搵到 {filteredRecipes.length} 款食譜
            </h2>
            <button
              onClick={handleGenerate}
              style={{
                padding: '12px 32px',
                background: colors.accent,
                color: colors.white,
                border: 'none',
                borderRadius: '30px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(240, 160, 96, 0.4)',
              }}
            >
              🍳 生成餐單
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                onClick={() => toggleRecipeSelection(recipe)}
                style={{
                  background: colors.white,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: selectedRecipes[recipe.id] ? `0 0 0 3px ${colors.primary}` : '0 2px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Selection indicator */}
                {selectedRecipes[recipe.id] && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '28px',
                    height: '28px',
                    background: colors.primary,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.white,
                    zIndex: 10,
                  }}>
                    ✓
                  </div>
                )}

                <div style={{ height: '180px', position: 'relative', background: colors.background }}>
                  {recipe.image_url ? (
                    <Image src={recipe.image_url} alt={recipe.name} fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                      🍳
                    </div>
                  )}
                </div>

                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
                    {recipe.name}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: colors.textLight, marginBottom: '12px' }}>
                    {recipe.description}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      background: colors.background, 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      color: colors.textLight 
                    }}>
                      ⏱️ {recipe.cooking_time || 20}分鐘
                    </span>
                    <span style={{ 
                      padding: '4px 10px', 
                      background: colors.sage, 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      color: colors.text 
                    }}>
                      {getDifficultyLabel(recipe.difficulty)}
                    </span>
                    <span style={{ 
                      padding: '4px 10px', 
                      background: colors.background, 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      color: colors.textLight 
                    }}>
                      {getSpeedLabel(recipe.speed)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Recipes Section */}
        {Object.keys(selectedRecipes).length > 0 && (
          <div style={{ 
            position: 'fixed', 
            bottom: '24px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            background: colors.primary,
            padding: '16px 32px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            zIndex: 100,
          }}>
            <span style={{ color: colors.white, fontWeight: '600' }}>
              已選擇 {Object.keys(selectedRecipes).length} 款食譜
            </span>
            <button
              onClick={generateShoppingList}
              style={{
                padding: '10px 20px',
                background: colors.accent,
                color: colors.white,
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              📝 生成購物清單
            </button>
            <button
              onClick={() => setSelectedRecipes({})}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: colors.white,
                border: `1px solid ${colors.white}`,
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              清除
            </button>
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
