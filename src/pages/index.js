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
      <section style={{ background: 'linear-gradient(135deg, #264653 0%, #E76F51 100%)', padding: '80px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>今晚食乜？</h1>
        <p style={{ fontSize: '20px', color: 'white', marginBottom: '32px' }}>每日晚餐話你知，一click生成一週餐單</p>
        <Button size="lg" onClick={() => window.location.href = '/generate'}>開始整 🍳</Button>
      </section>

      {/* Featured Recipes */}
      <section style={{ padding: '40px 40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#264653', marginBottom: '24px', textAlign: 'center' }}>精選食譜</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {featuredRecipes.map((recipe) => (
            <div key={recipe.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <div style={{ height: '140px', background: `url(${recipe.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#264653', marginBottom: '8px' }}>{recipe.name}</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{recipe.cooking_time}分鐘 · {recipe.calories} kcal</p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {recipe.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} style={{ background: '#E76F51', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Button variant="secondary" onClick={() => window.location.href = '/recipes'}>睇更多食譜 →</Button>
        </div>
      </section>
    </Layout>
  );
}
