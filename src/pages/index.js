'use client';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Button } from '@/components';
import { Layout } from '@/components';



export default function Home() {
  const [allRecipes, setAllRecipes] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch recipes
    fetch('/api/recipes')
      .then(res => {
        // Response
        return res.json();
      })
      .then(data => {
        // Data
        const recipes = data.recipes || data || [];
        // Recipes
        setAllRecipes(recipes);
        if (recipes.length > 0) {
          setVisibleCount(Math.min(8, recipes.length));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
  }, []);
  const loaderRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < allRecipes.length) {
        setVisibleCount(prev => Math.min(prev + 4, allRecipes.length));
      }
    }, { threshold: 0.1 });
    
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    
    return () => observer.disconnect();
  }, [visibleCount]);
  
  const visibleRecipes = (allRecipes || []).slice(0, visibleCount);
  // Use fallback recipes if allRecipes is empty
  const displayRecipes = (allRecipes && allRecipes.length > 0) ? allRecipes : [
    { id: '1', name: '番茄炒蛋', difficulty: 'easy', calories_per_serving: 180, cuisine: 'chinese', image_url: '' },
    { id: '2', name: '蒸水蛋', difficulty: 'easy', calories_per_serving: 120, cuisine: 'chinese', image_url: '' },
    { id: '3', name: '蝦仁炒蛋', difficulty: 'easy', calories_per_serving: 200, cuisine: 'chinese', image_url: '' },
    { id: '4', name: '苦瓜炒蛋', difficulty: 'easy', calories_per_serving: 150, cuisine: 'chinese', image_url: '' },
    { id: '5', name: '咖哩雞', difficulty: 'easy', calories_per_serving: 350, cuisine: 'japanese', image_url: '' },
    { id: '6', name: '豉油雞翼', difficulty: 'easy', calories_per_serving: 280, cuisine: 'chinese', image_url: '' },
    { id: '7', name: '薑蔥蒸雞', difficulty: 'easy', calories_per_serving: 250, cuisine: 'chinese', image_url: '' },
  ];
  const weeklyMenu = displayRecipes.slice(0, 7);
  const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const hasMore = visibleCount < allRecipes.length;
  return (
    <Layout>
      <Head><title>今晚食乜 🥘</title></Head>
      
      {/* Hero */}
      <section className="pt-12 pb-20 overflow-hidden relative" style={{ backgroundColor: 'var(--background)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full -z10" style={{ backgroundColor: 'var(--secondary)', opacity: 0.6 }} />
        <div className="absolute bottom-0 -left-12 w-48 h-48 rounded-full -z10" style={{ backgroundColor: 'var(--accent)', opacity: 0.4 }} />
        <div className="absolute top-1/4 -left-8 w-24 h-24 rounded-full -z10" style={{ backgroundColor: 'var(--accent)', opacity: 0.3 }} />
        <div className="absolute bottom-20 right-1/4 w-16 h-16 rounded-full -z10" style={{ backgroundColor: 'var(--primary)', opacity: 0.2 }} />
        <div className="absolute -bottom-8 right-0 w-32 h-32 rounded-full -z10" style={{ backgroundColor: 'var(--secondary)', opacity: 0.4 }} />
        
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <h1 style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', fontWeight: 900, color: 'var(--foreground)', lineHeight: 1.1 }}>
                今晚<br/>食乜?
              </h1>
              <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', marginTop: '1rem', marginBottom: '2rem' }}>
                每日晚餐話你知，一click生成一週餐單
              </p>
              <button 
                onClick={() => window.location.href = '/generate'}
                className="px-12 py-4 rounded-full text-white font-semibold text-lg hover:scale-105 transition-transform"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                生成食譜
              </button>
            </div>
            <div className="block">
              {/* Weekly Plan Card - New Style */}
              <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 w-full max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#9B6035' }}>
                      <span>📅</span>
                    </div>
                    <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>今週餐單</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#9B6035' }}>
                    7天
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { dish: '番茄炒蛋' },
                    { dish: '蒸水蛋' },
                    { dish: '蝦仁炒蛋' },
                    { dish: '苦瓜炒蛋' },
                    { dish: '咖哩雞' },
                    { dish: '豉油雞翼' },
                    { dish: '薑蔥蒸雞' },
                  ].map((recipe, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#fff' }}>
                      <span className="text-xs font-medium" style={{ color: '#374151' }}>{days[i]}</span>
                      <span className="text-xs" style={{ color: '#9B6035' }}>{'✓ ' + (recipe?.dish || recipe?.name || '未選擇')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 w-full py-2.5 rounded-xl text-sm text-white text-center cursor-pointer hover:opacity-90" style={{ backgroundColor: '#9B6035' }}>
                  生成購物清單 →
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '01', title: '設定偏好', desc: '選擇人數、烹飪時間、菜系和飲食限制。' },
              { num: '02', title: '生成餐單', desc: '系統即時為你生成均衡健康的7日晚餐安排。' },
              { num: '03', title: '開始買餸', desc: '自動生成購物清單，超市直接按清單採購。' },
            ].map((step, i) => (
              <div key={step.num} className="relative text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg" style={{ backgroundColor: '#14B8A6', fontWeight: 800, fontSize: '1.125rem' }}>
                  {step.num}
                </div>
                <h3 className="text-gray-900 mb-2" style={{ fontWeight: 600 }}>{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Featured Recipes */}
            <section className="py-16" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--foreground)' }}>精選食譜</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {visibleRecipes.map((recipe) => {
              const cuisineLabels = { chinese: '中式', japanese: '日式', korean: '韓式', western: '西式', vegetarian: '素食' };
              const methodLabels = { stir_fry: '炒', steamed: '蒸', braised: '炆', boiled: '煮', fried: '炸', grilled: '燒' };
              const difficultyLabels = { easy: '易', medium: '中', hard: '難' };
              const proteinLabels = { egg: '蛋', chicken: '雞', beef: '牛', pork: '豬', tofu: '豆腐', seafood: '海鮮', fish: '魚', vegetarian: '素' };
              const tags = [...(recipe.protein || []), ...(recipe.diet || [])].slice(0, 3);
              return (
              <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => window.location.href = '/recipes/' + recipe.id}>
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: recipe.image_url ? `url(${recipe.image_url})` : 'none', backgroundColor: '#DDD' }} />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--foreground)' }}>{recipe.name}</h3>
                  <div className="flex items-center gap-4 text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    <span>⏱️ {methodLabels[recipe.method] || recipe.speed || '-'}</span>
                    <span>💪 {difficultyLabels[recipe.difficulty] || '-'}</span>
                    <span>🔥 {recipe.calories_per_serving || '-'} 卡</span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#14B8A6', color: 'white' }}>{cuisineLabels[recipe.cuisine] || recipe.cuisine || '-'}</span>
                    {tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#C8D49A', color: '#3A2010' }}>{proteinLabels[tag] || tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            );})}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>載入更多...</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
