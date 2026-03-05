'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
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
  lightBg: '#F8F3E8',
  white: '#FFFFFF',
  sage: '#C8D49A',
  brown: '#9B6035',
  yellow: '#F0A060',
};

// Recipes fetched from API

const cuisineOptions = ['全部', 'chinese', 'japanese', 'korean', 'western', 'vegetarian'];
const timeOptions = ['全部', '15分鐘', '30分鐘'];
const difficultyOptions = ['全部', 'easy', 'medium', 'hard'];
const servingOptions = [1, 2, 3, 4];
const dishTypeOptions = ['全部', 'main', 'side'];
const dishTypeLabels = { '全部': '全部', 'main': '主菜', 'side': '小食' };
const speedOptions = ['全部', 'quick', 'normal'];
const speedLabels = { '全部': '全部', 'quick': '快', 'normal': ' normal' };
const mealsPerDayOptions = [1, 2, 3];

export default function GeneratePage() {
  const [allRecipes, setAllRecipes] = useState([]);
  
  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => setAllRecipes(data.recipes || []))
      .catch(() => {});
  }, []);
  
  const recipes = allRecipes;
  const router = useRouter();
  const [cuisine, setCuisine] = useState('全部');
  const [time, setTime] = useState('全部');
  const [difficulty, setDifficulty] = useState('全部');
  const [dishType, setDishType] = useState('全部');
  const [speed, setSpeed] = useState('全部');
  const [servings, setServings] = useState(2);
  const [mealsPerDay, setMealsPerDay] = useState(1);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const filterRecipes = () => {
    let filtered = [...recipes];
    if (cuisine !== '全部') filtered = filtered.filter(r => r.cuisine === cuisine);
    if (time !== '全部') filtered = filtered.filter(r => r.cooking_time <= (time === '15分鐘' ? 15 : 30));
    if (difficulty !== '全部') filtered = filtered.filter(r => r.difficulty === difficulty);
    if (dishType !== '全部') filtered = filtered.filter(r => r.dish_type === dishType);
    if (speed !== '全部') filtered = filtered.filter(r => r.speed === speed);
    setFilteredRecipes(filtered.length > 0 ? filtered : recipes);
  }

  useEffect(() => { 
    if (allRecipes.length > 0) {
      filterRecipes();
    }
  }, [allRecipes, cuisine, time, difficulty]);

  function handleGenerate() {
    router.push(`/menu?cuisine=${cuisine}&time=${time}&difficulty=${difficulty}&servings=${servings}&mealsPerDay=${mealsPerDay}`);
  }

  return (
    <>
      <Header />
      <Head><title>今晚食乜 - 生成餐單</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}><div style={{ background: colors.brown, padding: '24px 40px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>🔍 搜尋條件</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: colors.textLight, marginBottom: '2px' }}>🥢 邊種菜式</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {cuisineOptions.map((opt) => (
                    <button key={opt} onClick={() => setCuisine(opt)} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: cuisine === opt ? colors.brown : '#f0f0f0', color: cuisine === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: colors.textLight, marginBottom: '2px' }}>⏱️ 煮食時間</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {timeOptions.map((opt) => (
                    <button key={opt} onClick={() => setTime(opt)} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: time === opt ? colors.yellow : '#f0f0f0', color: time === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: colors.textLight, marginBottom: '2px' }}>💪 難度</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {difficultyOptions.map((opt) => (
                    <button key={opt} onClick={() => setDifficulty(opt)} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: difficulty === opt ? colors.yellow : '#f0f0f0', color: difficulty === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: colors.textLight, marginBottom: '2px' }}>👥 幾多人</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {servingOptions.map((opt) => (
                    <button key={opt} onClick={() => setServings(opt)} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: servings === opt ? colors.brown : '#f0f0f0', color: servings === opt ? 'white' : colors.text }}>{opt}人</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: colors.textLight, marginBottom: '2px' }}>🍱 一日幾多個菜</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {mealsPerDayOptions.map((opt) => (
                    <button key={opt} onClick={() => setMealsPerDay(opt)} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: mealsPerDay === opt ? colors.yellow : '#f0f0f0', color: mealsPerDay === opt ? 'white' : colors.text }}>{opt}個菜</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleGenerate} style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: '600', background: colors.yellow, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🍳 生成餐單</button>
          </div>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: colors.brown, marginBottom: '20px' }}>搵到 {filteredRecipes.length} 款食譜</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} style={{ display: 'flex', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ width: '180px', minHeight: '140px', background: recipe.image_url ? `url(${recipe.image_url})` : '#f5f5f5', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!recipe.image_url && <span style={{ fontSize: '40px' }}>🍳</span>}
                </div>
                <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.brown, marginBottom: '4px' }}>{recipe.name}</h3>
                      <p style={{ fontSize: '14px', color: colors.textLight }}>{recipe.description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {recipe.tags && recipe.tags.map((tag, i) => (
                      <span key={i} style={{ background: colors.lightBg, padding: '2px 10px', borderRadius: '4px', fontSize: '12px', color: colors.textLight }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: colors.text }}>
                    <span>⏱️ {recipe.cooking_time}分鐘</span>
                    <span>💪 {recipe.difficulty}</span>
                    <span>🔥 {recipe.calories} kcal</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
export const dynamic = 'force-dynamic'
