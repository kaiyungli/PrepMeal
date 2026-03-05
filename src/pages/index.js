'use client';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Button } from '@/components';
import { Layout } from '@/components';



export default function Home() {
  const [allRecipes, setAllRecipes] = useState([
    { id: '1', name: '番茄炒蛋', difficulty: 'easy', calories_per_serving: 180, cuisine: 'chinese', image_url: '' },
    { id: '2', name: '麻婆豆腐', difficulty: 'medium', calories_per_serving: 280, cuisine: 'chinese', image_url: '' },
    { id: '3', name: '咖哩雞', difficulty: 'easy', calories_per_serving: 350, cuisine: 'japanese', image_url: '' },
    { id: '4', name: '蒸水蛋', difficulty: 'easy', calories_per_serving: 120, cuisine: 'chinese', image_url: '' },
    { id: '5', name: '蝦仁炒蛋', difficulty: 'easy', calories_per_serving: 200, cuisine: 'chinese', image_url: '' },
    { id: '6', name: '苦瓜炒蛋', difficulty: 'easy', calories_per_serving: 150, cuisine: 'chinese', image_url: '' },
  ]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    console.log('Fetching recipes...');
    fetch('/api/recipes')
      .then(res => {
        console.log('Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Data received:', data);
        const recipes = data.recipes || data || [];
        console.log('Recipes:', recipes.length);
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
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#F8F3E8' }}>
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

      {/* Features Section */}
      <section className="py-20" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '✨', title: '一鍵生成七日餐單', desc: '根據你的人數、烹飪時間和口味偏好，即時生成均衡餐單。' },
              { icon: '🛒', title: '自動整理購物清單', desc: '所有食材自動合併計算，一張清單搞掂一週買餸。' },
              { icon: '⏰', title: '省時省力', desc: '再唔使每日問「今晚食乜？」，30秒完成一週規劃。' },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#3A2010' }}>{feature.title}</h3>
                <p className="text-sm" style={{ color: '#6B5B4F' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      

      

      {/* Featured Recipes */}
      {/* Testimonials */}
      <section className="py-20" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#3A2010' }}>用家分享</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Mandy Chan', role: '三口之家媽媽', comment: '每天最頭痛就係諗今晚食乜，用咗呢個app之後，規劃晚餐輕鬆好多！', stars: 5 },
              { name: 'Kevin Lam', role: '上班族', comment: '個購物清單功能真係超實用，唔使再重複買同一樣嘢，減少好多浪費。', stars: 5 },
              { name: 'Winnie Ho', role: '新手煮婦', comment: '食譜簡單易明，步驟清晰，連我呢種廚藝麻麻既人都可以跟住做！', stars: 5 },
            ].map((t, i) => (
              <div key={i} className="p-6 rounded-2xl" style={{ backgroundColor: '#F8F3E8' }}>
                <div className="flex gap-1 mb-4">{'⭐⭐⭐⭐⭐'}</div>
                <p className="text-sm mb-4" style={{ color: '#6B5B4F' }}>"{t.comment}"</p>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#3A2010' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: '#9B6035' }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--foreground)' }}>精選食譜</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {visibleRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => window.location.href = '/recipes/' + recipe.id}>
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: recipe.image_url ? `url(${recipe.image_url})` : 'none', backgroundColor: '#DDD' }} />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--foreground)' }}>{recipe.dish}</h3>
                  <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    <span>⏱️ {recipe.difficulty || '-'}</span>
                    <span>🔥 {recipe.calories_per_serving || '-'} kcal</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[recipe.difficulty || recipe.cuisine || 'easy'].slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
