'use client';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Button } from '@/components';
import { Layout } from '@/components';

// All recipes for homepage
const allRecipes = [
  { id: 4, name: "番茄炒蛋", cooking_time: 5, calories: 180, tags: ["簡易", "送飯"], image_url: "https://img.cook1cook.com/upload/cover/15/91/9779914994051761591.jpg" },
  { id: 5, name: "麻婆豆腐", cooking_time: 15, calories: 280, tags: ["辣", "送飯"], image_url: "https://www.christinesrecipes.com/wp-content/uploads/2010/01/Mapo-Tofu.jpg" },
  { id: 6, name: "蔥花蒸水蛋", cooking_time: 10, calories: 120, tags: ["健康", "簡易"], image_url: "https://kikkomanusa.com/chinese/wp-content/uploads/sites5/2022/01/31040_Chinese-Steamed-Eggs.jpg" },
  { id: 10, name: "咖喱薯仔炆雞翼", cooking_time: 30, calories: 380, tags: ["送飯", "咖喱"], image_url: "https://images.unsplash.com/photo-1606152426935-3381f2f6520c?w=400" },
  { id: 7, name: "魚香茄子", cooking_time: 15, calories: 180, tags: ["送飯", "中式"], image_url: "" },
  { id: 8, name: "鼓汁蒸排骨", cooking_time: 20, calories: 320, tags: ["蒸", "送飯"], image_url: "" },
  { id: 9, name: "韭菜炒蛋", cooking_time: 10, calories: 150, tags: ["簡易", "健康"], image_url: "" },
  { id: 11, name: "蒜蓉炒菜心", cooking_time: 8, calories: 80, tags: ["健康", "簡易"], image_url: "" },
  { id: 12, name: "西蘭花炒牛肉", cooking_time: 15, calories: 250, tags: ["送飯", "健康"], image_url: "" },
  { id: 13, name: "乾炒牛河", cooking_time: 12, calories: 380, tags: ["主食", "經典"], image_url: "" },
  { id: 14, name: "揚州炒飯", cooking_time: 15, calories: 420, tags: ["主食", "經典"], image_url: "" },
  { id: 15, name: "雲吞麵", cooking_time: 12, calories: 320, tags: ["主食", "簡易"], image_url: "" }
];

export default function Home() {
  const [visibleCount, setVisibleCount] = useState(4);
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
  
  const visibleRecipes = allRecipes.slice(0, visibleCount);
  const hasMore = visibleCount < allRecipes.length;
  return (
    <Layout>
      <Head><title>今晚食乜 🥘</title></Head>
      
      {/* Hero */}
      <section className="pt-12 pb-20 overflow-hidden relative" style={{ backgroundColor: 'var(--background)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full" style={{ backgroundColor: 'var(--secondary)', opacity: 0.6 }} />
        <div className="absolute bottom-0 -left-12 w-48 h-48 rounded-full" style={{ backgroundColor: 'var(--accent)', opacity: 0.4 }} />
        <div className="absolute top-1/4 -left-8 w-24 h-24 rounded-full" style={{ backgroundColor: 'var(--accent)', opacity: 0.3 }} />
        <div className="absolute bottom-20 right-1/4 w-16 h-16 rounded-full" style={{ backgroundColor: 'var(--primary)', opacity: 0.2 }} />
        <div className="absolute -bottom-8 right-0 w-32 h-32 rounded-full" style={{ backgroundColor: 'var(--secondary)', opacity: 0.4 }} />
        
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
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
              {/* Weekly Plan Card - Exact Figma Code */}
              <div className="relative w-full rounded-2xl p-6 border-2 bg-white" style={{ borderColor: '#DDD0B0', boxShadow: '0 20px 60px rgba(155,96,53,0.14)', maxWidth: '520px' }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C0A080' }}>本週計劃</p>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#9B6035' }}>WEEKLY PLAN</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#9B6035' }}>
                    <span style={{ fontSize: '1rem' }}>🍜</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  {/* 本週餐單 */}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9B6035', marginBottom: '0.5rem' }}>📅 本週餐單</p>
                    <div className="space-y-2">
                      {[
                        { day: '星期一', dish: '番茄炒蛋', done: true },
                        { day: '星期二', dish: '咖哩雞', done: true },
                        { day: '星期三', dish: '西蘭花牛肉', done: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl border" style={item.done ? { backgroundColor: 'rgba(200,212,154,0.30)', borderColor: 'rgba(155,96,53,0.22)' } : { backgroundColor: '#faf7f0', borderColor: '#DDD0B0' }}>
                          <span className="text-xs font-medium" style={{ color: '#3A2010' }}>{item.day}</span>
                          <span className="text-xs" style={{ color: '#AA7A50' }}>{item.dish}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-px self-stretch" style={{ backgroundColor: '#DDD0B0' }} />
                  {/* 購物清單 */}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9B6035', marginBottom: '0.5rem' }}>🛒 購物清單</p>
                    <div className="space-y-2">
                      {[
                        { name: '雞蛋', qty: 'x6' },
                        { name: '番茄', qty: 'x4' },
                        { name: '牛肉', qty: '300g' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl border" style={{ backgroundColor: '#faf7f0', borderColor: '#DDD0B0' }}>
                          <span className="text-xs font-medium" style={{ color: '#3A2010' }}>{item.name}</span>
                          <span className="text-xs" style={{ color: '#AA7A50' }}>{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 text-white rounded-xl px-4 py-2 shadow-lg" style={{ backgroundColor: '#F0A060' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>✓ 已生成</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      

      {/* Featured Recipes */}
      <section className="py-16" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--foreground)' }}>精選食譜</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {visibleRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => window.location.href = '/recipes'}>
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${recipe.image_url})` }} />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--foreground)' }}>{recipe.name}</h3>
                  <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    <span>⏱️ {recipe.cooking_time}分鐘</span>
                    <span>🔥 {recipe.calories} kcal</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {recipe.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9B6035', borderTopColor: 'transparent' }}></div>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>載入中...</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
