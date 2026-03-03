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

// Static recipe data - instant!
const recipes = [
  { id: 1, name: "番茄炒蛋", cooking_time: 15, difficulty: "易", cuisine: "中式", calories: 180, image_url: "", tags: ["送飯", "簡易"], description: "簡單美味既家常菜", instructions: ["番茄切塊", "蛋發勻", "炒蛋", "加入番茄"] },
  { id: 2, name: "麻婆豆腐", cooking_time: 25, difficulty: "中", cuisine: "中式", calories: 280, image_url: "", tags: ["辣", "送飯"], description: "麻辣惹味既豆腐料理", instructions: ["豆腐切塊", "炒肉碎", "加入麻辣醬", "燜煮"] },
  { id: 3, name: "蔥花蒸水蛋", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 120, image_url: "", tags: ["健康", "簡易"], description: "嫩滑既蒸水蛋", instructions: ["蛋發勻", "加入蔥花", "加水調味", "蒸10分鐘"] }
]

const sampleMenu = [
  { day: '星期一', recipe: recipes[0] },
  { day: '星期二', recipe: recipes[1] },
  { day: '星期三', recipe: recipes[2] },
  { day: '星期四', recipe: recipes[0] },
  { day: '星期五', recipe: recipes[1] },
  { day: '星期六', recipe: recipes[2] },
  { day: '星期日', recipe: recipes[0] },
];

const categories = [
  { name: '中式', icon: '🥢' },
  { name: '西式', icon: '🍝' },
  { name: '日式', icon: '🍣' },
  { name: '韓式', icon: '🥘' },
  { name: '素食', icon: '🥗' },
];

const flavorOptions = ['全部', '中式', '西式', '日式', '韓式', '素食'];
const difficultyOptions = ['全部', '易', '中', '難'];
const timeOptions = ['全部', '15分鐘', '30分鐘'];
const equipmentOptions = ['全部', '微波爐', '焗爐', '氣炸鍋', '明火'];
const servingOptions = [1, 2, 3, 4];

export default function Home() {
  const [view, setView] = useState('home');
  const [recipeList, setRecipeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [cuisineFilter, setCuisineFilter] = useState('全部');
  const [timeFilter, setTimeFilter] = useState('全部');
  const [difficultyFilter, setDifficultyFilter] = useState('全部');
  const [equipmentFilter, setEquipmentFilter] = useState('全部');
  const [servings, setServings] = useState(2);

  useEffect(() => {
    // Use static data - instant!
    setRecipeList(recipes);
    setLoading(false);
  }, []);

  return (
    <>
      <Head>
        <title>今晚食乜 🥘</title>
        <meta name="description" content="Generate weekly meal plan" />
      </Head>

      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <header style={{ background: colors.cream, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🥘</span>
            <span style={{ fontSize: '22px', fontWeight: '700', color: colors.brown }}>今晚食乜</span>
          </div>
          <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#" style={{ color: colors.text, textDecoration: 'none', fontWeight: '500' }}>首頁</a>
            <a href="/recipes" style={{ color: colors.textLight, textDecoration: 'none' }}>食譜</a>
            <a href="#" style={{ color: colors.textLight, textDecoration: 'none' }}>關於</a>
            <button onClick={() => window.location.href = `/generate?cuisine=${cuisineFilter}&time=${timeFilter}&difficulty=${difficultyFilter}&servings=${servings}`} style={{ background: colors.yellow, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '25px', fontWeight: '600', cursor: 'pointer' }}>開始整</button>
          </nav>
        </header>

        {/* Hero */}
        <section style={{ background: `linear-gradient(135deg, ${colors.brown} 0%, ${colors.yellow} 100%)`, padding: '80px 40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>今晚食乜？</h1>
          <p style={{ fontSize: '20px', color: 'white', marginBottom: '32px' }}>每日晚餐話你知，一click生成一週餐單</p>
          <button onClick={() => window.location.href = `/generate?cuisine=${cuisineFilter}&time=${timeFilter}&difficulty=${difficultyFilter}&servings=${servings}`} style={{ padding: '16px 40px', fontSize: '18px', fontWeight: '600', background: 'white', color: colors.brown, border: 'none', borderRadius: '30px', cursor: 'pointer' }}>開始整 🍳</button>
        </section>

        {/* Filters (use /generate page) */}
        {/* <section style={{ padding: '20px 40px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.brown, marginBottom: '20px' }}>🔍 篩選條件</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>🥢 邊種菜式</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {flavorOptions.map((opt) => (
                  <button key={opt} onClick={() => setCuisineFilter(opt)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: cuisineFilter === opt ? colors.brown : '#f0f0f0', color: cuisineFilter === opt ? 'white' : colors.text }}>{opt}</button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>⏱️ 煮食時間</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {timeOptions.map((opt) => (
                  <button key={opt} onClick={() => setTimeFilter(opt)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: timeFilter === opt ? colors.yellow : '#f0f0f0', color: timeFilter === opt ? 'white' : colors.text }}>{opt}</button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>💪 難度</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {difficultyOptions.map((opt) => (
                  <button key={opt} onClick={() => setDifficultyFilter(opt)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: difficultyFilter === opt ? colors.yellow : '#f0f0f0', color: difficultyFilter === opt ? 'white' : colors.text }}>{opt}</button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>👥 幾多人</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {servingOptions.map((opt) => (
                  <button key={opt} onClick={() => setServings(opt)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: servings === opt ? colors.brown : '#f0f0f0', color: servings === opt ? 'white' : colors.text }}>{opt}人</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Recipe Cards */}
        {!loading && (
          <section style={{ padding: '20px 40px', maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.brown, marginBottom: '24px' }}>熱門食譜</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {recipeList.map((meal, i) => (
                <div key={i} onClick={() => setSelectedRecipe(meal)} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                  <div style={{ height: '160px', background: meal.image_url ? `url(${meal.image_url})` : '#f0f0f0', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, marginBottom: '8px' }}>{meal.name}</h3>
                    <p style={{ fontSize: '13px', color: colors.textLight, marginBottom: '12px' }}>{meal.cooking_time}分鐘 · {meal.cuisine} {meal.calories && `· ${meal.calories} kcal`}</p>
                    <button style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px solid ${colors.brown}`, color: colors.brown, borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}>查看更多</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div onClick={() => setSelectedRecipe(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            {selectedRecipe.image_url && <div style={{ height: '250px', background: `url(${selectedRecipe.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.brown, marginBottom: '12px' }}>{selectedRecipe.name}</h2>
              <p style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>{selectedRecipe.cooking_time}分鐘 · {selectedRecipe.difficulty} · {selectedRecipe.cuisine} {selectedRecipe.calories && `· ${selectedRecipe.calories} kcal`}</p>
              {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  {selectedRecipe.tags.map((tag, idx) => (
                    <span key={idx} style={{ display: 'inline-block', background: colors.yellow, color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', marginRight: '8px' }}>{tag}</span>
                  ))}
                </div>
              )}
              {selectedRecipe.description && <p style={{ fontSize: '14px', color: colors.text, marginBottom: '20px', lineHeight: '1.6' }}>{selectedRecipe.description}</p>}
              {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, marginBottom: '12px' }}>做法</h4>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    {selectedRecipe.instructions.map((step, idx) => (
                      <li key={idx} style={{ fontSize: '14px', color: colors.text, marginBottom: '8px', lineHeight: '1.5' }}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              <button onClick={() => setSelectedRecipe(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
