'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  yellow: '#E76F51',
  lightBg: '#faf8f5',
  text: '#264653',
  textLight: '#6b7280',
};

const recipes = [
  { id: 1, name: "番茄炒蛋", cooking_time: 15, difficulty: "易", cuisine: "中式", calories: 180, image_url: "", tags: ["送飯", "簡易"], description: "簡單美味既家常菜", instructions: ["番茄切塊", "蛋發勻", "炒蛋", "加入番茄"] },
  { id: 2, name: "麻婆豆腐", cooking_time: 25, difficulty: "中", cuisine: "中式", calories: 280, image_url: "", tags: ["辣", "送飯"], description: "麻辣惹味既豆腐料理", instructions: ["豆腐切塊", "炒肉碎", "加入麻辣醬", "燜煮"] },
  { id: 3, name: "蔥花蒸水蛋", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 120, image_url: "", tags: ["健康", "簡易"], description: "嫩滑既蒸水蛋", instructions: ["蛋發勻", "加入蔥花", "加水調味", "蒸10分鐘"] }
]

export default function RecipesPage() {
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  return (
    <>
      <Head>
        <title>今晚食乜 - 食譜</title>
      </Head>

      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <header style={{ background: colors.cream, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🥘</span>
            <span style={{ fontSize: '22px', fontWeight: '700', color: colors.brown }}>今晚食乜</span>
          </div>
          <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="/" style={{ color: colors.textLight, textDecoration: 'none' }}>首頁</a>
            <a href="/generate" style={{ color: colors.text, textDecoration: 'none', fontWeight: '500' }}>生成餐單</a>
          </nav>
        </header>

        {/* Recipes List */}
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown, marginBottom: '8px' }}>全部食譜</h1>
          <p style={{ color: colors.textLight, marginBottom: '32px' }}>共 {recipes.length} 款食譜</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {recipes.map((recipe) => (
              <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                <div style={{ height: '160px', background: recipe.image_url ? `url(${recipe.image_url})` : '#f5f5f5', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!recipe.image_url && <span style={{ fontSize: '48px' }}>🍳</span>}
                </div>
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, marginBottom: '8px' }}>{recipe.name}</h3>
                  <p style={{ fontSize: '13px', color: colors.textLight, marginBottom: '12px' }}>{recipe.cooking_time}分鐘 · {recipe.cuisine} · {recipe.calories} kcal</p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {recipe.tags.map((tag, i) => (
                      <span key={i} style={{ background: colors.yellow, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div onClick={() => setSelectedRecipe(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', position: 'relative' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.brown, marginBottom: '12px' }}>{selectedRecipe.name}</h2>
              <p style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>{selectedRecipe.cooking_time}分鐘 · {selectedRecipe.difficulty} · {selectedRecipe.calories} kcal</p>
              <p style={{ fontSize: '14px', color: colors.text, marginBottom: '16px' }}>{selectedRecipe.description}</p>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, marginBottom: '8px' }}>做法</h4>
              <ol style={{ paddingLeft: '20px', fontSize: '14px', color: colors.text }}>
                {selectedRecipe.instructions.map((step, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>{step}</li>
                ))}
              </ol>
              <button onClick={() => setSelectedRecipe(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>✕</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
