'use client';
import { useState, useEffect, useRef } from 'react';

export const dynamic = 'force-dynamic';
import Image from 'next/image';
import Head from 'next/head';
import { Button } from '@/components';
import { Layout } from '@/components';



export default function Home() {
  const [allRecipes, setAllRecipes] = useState(typeof window !== 'undefined' ? [] : (typeof initialRecipes !== 'undefined' ? initialRecipes : []));
  const [visibleCount, setVisibleCount] = useState(4);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    // Fetch recipes
    fetch('/api/recipes?limit=8&offset=0')
      .then(res => {
        // Response
        return res.json();
      })
      .then(data => {
        // Data
        const recipes = data.recipes || data || [];
        // Recipes
        setAllRecipes(recipes);
        // setLoading removed
        if (recipes.length > 0) {
          setVisibleCount(Math.min(8, recipes.length));
        }
      })
      .catch(err => {
        console.error('Fetch error:', err);
        // setLoading removed
      });
  }, []);
  const loaderRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        // Fetch more with pagination
      fetch(`/api/recipes?limit=8&offset=${allRecipes.length}`)
        .then(r => r.json())
        .then(data => {
          setAllRecipes(prev => [...prev, ...(data.recipes || [])]);
          setLoadingMore(false);
          setVisibleCount(prev => prev + 8);
          setHasMore(data.hasMore !== false);
        });
      }
    }, { threshold: 0.1 });
    
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    
    return () => observer.disconnect();
  }, [visibleCount]);
  
  const visibleRecipes = (allRecipes || []).slice(0, visibleCount);
  
  // Show grid - data loads via useEffect
  const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  return (
    <Layout>
      <Head><title>今晚食乜 🥘</title></Head>
      
      {/* Hero */}
      <section className="pt-12 pb-20 overflow-hidden relative" className="bg-[#F8F3E8]">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full -z10" className="absolute -top-16 -right-16 w-80 h-80 rounded-full -z10 bg-[#C8D49A]/[0.6]" />
        <div className="absolute bottom-0 -left-12 w-48 h-48 rounded-full -z10" className="absolute bottom-0 -left-12 w-48 h-48 rounded-full -z10 bg-[#F0A060]/[0.4]" />
        <div className="absolute top-1/4 -left-8 w-24 h-24 rounded-full -z10" className="absolute top-1/4 -left-8 w-24 h-24 rounded-full -z10 bg-[#F0A060]/[0.3]" />
        <div className="absolute bottom-20 right-1/4 w-16 h-16 rounded-full -z10" className="absolute bottom-20 right-1/4 w-16 h-16 rounded-full -z10 bg-[#9B6035]/[0.2]" />
        <div className="absolute -bottom-8 right-0 w-32 h-32 rounded-full -z10" className="absolute -bottom-8 right-0 w-32 h-32 rounded-full -z10 bg-[#C8D49A]/[0.4]" />
        
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <h1 className="text-[clamp(3rem,10vw,6rem)] font-black text-[#3A2010] leading-[1.1]">
                今晚<br/>食乜?
              </h1>
              <p className="text-xl text-[#AA7A50] mt-4 mb-8">
                每日晚餐話你知，一click生成一週餐單
              </p>
              <button 
                onClick={() => window.location.href = '/generate'}
                className="px-12 py-4 rounded-full text-white font-semibold text-lg hover:scale-105 transition-transform"
                className="bg-[#9B6035]"
              >
                生成食譜
              </button>
            </div>
            <div className="block">
              {/* Weekly Plan Card - New Style */}
              <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 w-full max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" className="bg-[#9B6035]">
                      <span>📅</span>
                    </div>
                    <span className="text-sm text-gray-700" className="font-semibold">今週餐單</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" className="bg-[#9B6035]">
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
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg" className="bg-white">
                      <span className="text-xs font-medium text-gray-700">{days[i]}</span>
                      <span className="text-xs text-[#9B6035]">{'✓ ' + (recipe?.dish || recipe?.name || '未選擇')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 w-full py-2.5 rounded-xl text-sm text-white text-center cursor-pointer hover:opacity-90" className="bg-[#9B6035]">
                  生成購物清單 →
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16" className="bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '01', title: '設定偏好', desc: '選擇人數、烹飪時間、菜系和飲食限制。' },
              { num: '02', title: '生成餐單', desc: '系統即時為你生成均衡健康的7日晚餐安排。' },
              { num: '03', title: '開始買餸', desc: '自動生成購物清單，超市直接按清單採購。' },
            ].map((step, i) => (
              <div key={step.num} className="relative text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg" className="bg-teal-500 font-extrabold text-lg">
                  {step.num}
                </div>
                <h3 className="text-gray-900 mb-2" className="font-semibold">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Featured Recipes */}
            <section className="py-16" className="bg-[#F8F3E8]">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12" className="text-[#3A2010]">精選食譜</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {visibleRecipes.map((recipe) => {
              const cuisineLabels = { chinese: '中式', japanese: '日式', korean: '韓式', western: '西式', vegetarian: '素食' };
              const methodLabels = { stir_fry: '炒', steamed: '蒸', braised: '炆', boiled: '煮', fried: '炸', grilled: '燒' };
              const difficultyLabels = { easy: '易', medium: '中', hard: '難' };
              const proteinLabels = { egg: '蛋', chicken: '雞', beef: '牛', pork: '豬', tofu: '豆腐', seafood: '海鮮', fish: '魚', vegetarian: '素' };
              const tags = [...(recipe.protein || []), ...(recipe.diet || [])].slice(0, 3);
              return (
              <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => window.location.href = '/recipes/' + recipe.id}>
                {recipe.image_url ? (
              <div className="h-48 relative">
                <Image src={recipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} alt={recipe.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-48 bg-gray-200" />
            )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2" className="text-[#3A2010]">{recipe.name}</h3>
                  <div className="flex items-center gap-4 text-sm mb-2" className="text-[#AA7A50]">
                    <span>⏱️ {methodLabels[recipe.method] || recipe.speed || '-'}</span>
                    <span>💪 {difficultyLabels[recipe.difficulty] || '-'}</span>
                    <span>🔥 {recipe.calories_per_serving || '-'} 卡</span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-1 rounded text-xs" className="bg-teal-500 text-white">{cuisineLabels[recipe.cuisine] || recipe.cuisine || '-'}</span>
                    {tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 rounded text-xs" className="bg-[#C8D49A] text-[#3A2010]">{proteinLabels[tag] || tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            );})}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="text-center py-8">
              <p className="text-sm" className="text-[#AA7A50]">載入更多...</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

// Force dynamic rendering


export async function getServerSideProps() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: recipes } = await supabase.from('recipes').select('id,name,slug,description,image_url,cuisine,dish_type,method,speed,difficulty,calories_per_serving').limit(20);
    return { props: { initialRecipes: recipes || [] } };
  } catch (e) {
    return { props: { initialRecipes: [] } };
  }
}
