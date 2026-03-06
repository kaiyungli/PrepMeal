'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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

export default function RecipeDetail() {
  
  // Get ID from URL
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';
  const [recipe, setRecipe] = useState({ name: '', steps: [] });
  const [loading, setLoading] = useState(true);

  // Get ID from URL
  const recipeId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';

  useEffect(() => {
    if (!recipeId) return;
    fetch(`/api/recipes?id=${recipeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.recipes && data.recipes[0]) {
          setRecipe(data.recipes[0]);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error('Failed to fetch recipe:', e);
        setLoading(false);
      });
  }, [id]);

  // Also watch for router ready
  

  // Show loading if no name yet
  if (!recipe || !recipe.name) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', background: colors.background, padding: '40px', textAlign: 'center' }}>
          <p>載入中...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!recipe || recipe.name === '') {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', background: colors.background, padding: '40px', textAlign: 'center' }}>
          <p>找不到食譜</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <Head><title>{recipe.name} - 今晚食乜</title></Head>

      <div style={{ minHeight: '100vh', background: colors.background, padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Hero Image */}
          <div
            style={{
              height: '300px',
              borderRadius: '16px',
              background: recipe.image_url ? `url(${recipe.image_url}) center/cover` : colors.secondary,
              marginBottom: '24px'
            }}
          />

          {/* Title */}
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: colors.text, marginBottom: '16px' }}>
            {recipe.name}
          </h1>

          {/* Description */}
          <p style={{ color: colors.textLight, marginBottom: '24px' }}>
            {recipe.description || '暂无描述'}
          </p>

          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {recipe.cuisine && <span style={{ background: colors.primary, color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: '12px' }}>{recipe.cuisine}</span>}
            {recipe.difficulty && <span style={{ background: colors.accent, color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: '12px' }}>{recipe.difficulty}</span>}
            
            {recipe.speed && recipe.speed && <span style={{ background: colors.sage, color: colors.text, padding: '4px 12px', borderRadius: '16px', fontSize: '12px' }}>{recipe.speed}</span>}
          </div>

          {/* Nutrition */}
          {(recipe.calories_per_serving || recipe.protein_g) && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.text, marginBottom: '12px' }}>營養資料 (每份)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: colors.primary }}>{recipe.calories_per_serving || '-'}</p>
                  <p style={{ fontSize: '12px', color: colors.textLight }}>卡路里</p>
                </div>
                <div>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: colors.primary }}>{recipe.protein_g || '-'}</p>
                  <p style={{ fontSize: '12px', color: colors.textLight }}>蛋白質 (g)</p>
                </div>
                <div>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: colors.primary }}>{recipe.carbs_g || '-'}</p>
                  <p style={{ fontSize: '12px', color: colors.textLight }}>碳水 (g)</p>
                </div>
                <div>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: colors.primary }}>{recipe.fat_g || '-'}</p>
                  <p style={{ fontSize: '12px', color: colors.textLight }}>脂肪 (g)</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Cooking Steps */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, marginBottom: '16px' }}>烹飪步驟</h3>
            {(recipe.steps && recipe.steps.length > 0) ? recipe.steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>{s.step_no}</div>
                <div>
                  <p style={{ fontSize: '14px', color: colors.textLight }}>{s.text}</p>
                </div>
              </div>
            )) : <p style={{ color: colors.textLight }}>暂无步驟資料</p>}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
