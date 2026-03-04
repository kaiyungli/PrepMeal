'use client';
import { useState } from 'react';
import Head from 'next/head';
import { Button } from '@/components';
import { Layout } from '@/components';

// 4 Featured recipes for homepage
const featuredRecipes = [
  { id: 4, name: "番茄炒蛋", cooking_time: 5, difficulty: "易", cuisine: "中式", calories: 180, description: "經典廣東小菜，酸甜開胃", tags: ["簡易", "送飯"], image_url: "https://img.cook1cook.com/upload/cover/15/91/9779914994051761591.jpg" },
  { id: 5, name: "麻婆豆腐", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 280, description: "四川經典麻辣豆腐", tags: ["辣", "送飯"], image_url: "https://www.christinesrecipes.com/wp-content/uploads/2010/01/Mapo-Tofu.jpg" },
  { id: 6, name: "蔥花蒸水蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 120, description: "滑嫩蒸蛋，香蔥提味", tags: ["健康", "簡易"], image_url: "https://kikkomanusa.com/chinese/wp-content/uploads/sites5/2022/01/31040_Chinese-Steamed-Eggs.jpg" },
  { id: 10, name: "咖喱薯仔炆雞翼", cooking_time: 30, difficulty: "中", cuisine: "中式", calories: 380, description: "咖喱香濃，雞翼入味", tags: ["送飯", "咖喱"], image_url: "https://images.unsplash.com/photo-1606152426935-3381f2f6520c?w=400" }
];

export default function Home() {
  return (
    <Layout>
      <Head><title>今晚食乜 🥘</title></Head>
      
      {/* Hero */}
      <section className="pt-12 pb-20 overflow-hidden relative" style={{ backgroundColor: '#F8F3E8' }}>
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full" style={{ backgroundColor: '#C8D49A', opacity: 0.6 }} />
        <div className="absolute bottom-0 -left-12 w-48 h-48 rounded-full" style={{ backgroundColor: '#E8C87A', opacity: 0.4 }} />
        
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', fontWeight: 900, color: '#3A2010', lineHeight: 1.1 }}>
                今晚<br/>食乜?
              </h1>
              <p style={{ fontSize: '1.25rem', color: '#6B5B4F', marginTop: '1rem', marginBottom: '2rem' }}>
                每日晚餐話你知，一click生成一週餐單
              </p>
              <button 
                onClick={() => window.location.href = '/generate'}
                className="px-12 py-4 rounded-full text-white font-semibold text-lg hover:scale-105 transition-transform"
                style={{ backgroundColor: '#9B6035' }}
              >
                生成食譜
              </button>
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <div className="w-72 h-72 mx-auto rounded-3xl overflow-hidden shadow-xl" style={{ backgroundColor: '#C8D49A' }}>
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    🍜
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Recipes */}
      <section className="py-16" style={{ backgroundColor: '#F8F3E8' }}>
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#3A2010' }}>精選食譜</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {featuredRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => window.location.href = '/recipes'}>
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${recipe.image_url})` }} />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2" style={{ color: '#3A2010' }}>{recipe.name}</h3>
                  <div className="flex items-center gap-4 text-sm" style={{ color: '#6B5B4F' }}>
                    <span>⏱️ {recipe.cooking_time}分鐘</span>
                    <span>🔥 {recipe.calories} kcal</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {recipe.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#C8D49A', color: '#3A2010' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button 
              onClick={() => window.location.href = '/recipes'}
              className="px-8 py-3 rounded-full font-semibold"
              style={{ backgroundColor: '#9B6035', color: 'white' }}
            >
              睇更多食譜 →
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
