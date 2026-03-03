'use client';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  yellow: '#E76F51',
  lightBg: '#faf8f5',
  text: '#264653',
  textLight: '#6b7280',
};

const cuisineOptions = ['全部', '中式', '西式', '日式', '韓式', '素食'];
const timeOptions = ['全部', '15分鐘', '30分鐘'];
const difficultyOptions = ['全部', '易', '中', '難'];
const servingOptions = [1, 2, 3, 4];

export default function GeneratePage() {
  const router = useRouter();
  const [cuisine, setCuisine] = useState('全部');
  const [time, setTime] = useState('全部');
  const [difficulty, setDifficulty] = useState('全部');
  const [servings, setServings] = useState(2);

  function handleGenerate() {
    router.push(`/menu?cuisine=${cuisine}&time=${time}&difficulty=${difficulty}&servings=${servings}`);
  }

  return (
    <>
      <Head>
        <title>今晚食乜 - 生成餐單</title>
      </Head>

      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <header style={{ background: colors.cream, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🥘</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.brown }}>今晚食乜</span>
          </div>
          <a href="/" style={{ color: colors.text, textDecoration: 'none', fontWeight: '500' }}>返回首頁</a>
        </header>

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown, marginBottom: '8px', textAlign: 'center' }}>
            設定餐單
          </h1>
          <p style={{ textAlign: 'center', color: colors.textLight, marginBottom: '32px' }}>
            選擇你既偏好，一click生成一週晚餐
          </p>

          {/* Filters */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
            {/* Cuisine */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '12px', fontSize: '16px' }}>🥢 邊種菜式</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {cuisineOptions.map((opt) => (
                  <button key={opt} onClick={() => setCuisine(opt)} style={{ padding: '10px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: cuisine === opt ? colors.brown : '#f0f0f0', color: cuisine === opt ? 'white' : colors.text }}>{opt}</button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '12px', fontSize: '16px' }}>⏱️ 煮食時間</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {timeOptions.map((opt) => (
                  <button key={opt} onClick={() => setTime(opt)} style={{ padding: '10px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: time === opt ? colors.yellow : '#f0f0f0', color: time === opt ? 'white' : colors.text }}>{opt}</button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '12px', fontSize: '16px' }}>💪 難度</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {difficultyOptions.map((opt) => (
                  <button key={opt} onClick={() => setDifficulty(opt)} style={{ padding: '10px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: difficulty === opt ? colors.yellow : '#f0f0f0', color: difficulty === opt ? 'white' : colors.text }}>{opt}</button>
                ))}
              </div>
            </div>

            {/* Servings */}
            <div style={{ marginBottom: '0px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '12px', fontSize: '16px' }}>👥 幾多人</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {servingOptions.map((opt) => (
                  <button key={opt} onClick={() => setServings(opt)} style={{ padding: '10px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: servings === opt ? colors.brown : '#f0f0f0', color: servings === opt ? 'white' : colors.text }}>{opt}人</button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerate} style={{ width: '100%', padding: '18px', fontSize: '18px', fontWeight: '600', background: colors.yellow, color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer' }}>
            🍳 生成餐單
          </button>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
