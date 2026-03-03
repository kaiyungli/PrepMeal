'use client';
import { useState } from 'react';
import Head from 'next/head';
import { Button } from '@/components';
import { Layout, Card } from '@/components';

// Sample recipes for homepage
const sampleRecipes = [
  { name: '番茄炒蛋', cooking_time: 5 },
  { name: '麻婆豆腐', cooking_time: 15 },
  { name: '蔥花蒸水蛋', cooking_time: 10 },
  { name: '魚香茄子', cooking_time: 15 },
  { name: '鼓汁蒸排骨', cooking_time: 20 },
  { name: '韭菜炒蛋', cooking_time: 10 },
  { name: '蒜蓉炒菜心', cooking_time: 8 },
];
const sampleMenu = sampleRecipes.map((r, i) => ({
  day: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][i],
  ...r
}));

export default function Home() {
  const [servings] = useState(2);

  return (
    <Layout>
      <Head><title>今晚食乜 🥘</title></Head>
      
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #264653 0%, #E76F51 100%)', padding: '80px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>今晚食乜？</h1>
        <p style={{ fontSize: '20px', color: 'white', marginBottom: '32px' }}>每日晚餐話你知，一click生成一週餐單</p>
        <Button size="lg" onClick={() => window.location.href = '/generate'}>開始整 🍳</Button>
      </section>

      {/* Sample Menu */}
      <section style={{ padding: '40px 40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#264653', marginBottom: '24px', textAlign: 'center' }}>今週晚餐建議</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {sampleMenu.map((item, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{item.day}</div>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🍳</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#264653' }}>{item.name}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{item.cooking_time}分鐘</div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
