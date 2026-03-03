'use client';
import { Card, Modal } from '@/components';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  yellow: '#E76F51',
  lightBg: '#faf8f5',
  text: '#264653',
  textLight: '#6b7280',
};

// Static data - same as API
const recipes = [
  { id: 4, name: "番茄炒蛋", cooking_time: 5, difficulty: "易", cuisine: "中式", calories: 180, description: "經典廣東小菜，酸甜開胃，簡單易整，新手必學", tags: ["簡易", "送飯"], image_url: "https://img.cook1cook.com/upload/cover/15/91/9779914994051761591.jpg" },
  { id: 5, name: "麻婆豆腐", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 280, description: "四川經典麻辣豆腐，麻辣鮮香，豆腐嫩滑，送飯一流", tags: ["辣", "送飯"], image_url: "https://www.christinesrecipes.com/wp-content/uploads/2010/01/Mapo-Tofu.jpg" },
  { id: 6, name: "蔥花蒸水蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 120, description: "滑嫩蒸蛋，香蔥提味，營養健康，老少皆宜", tags: ["健康", "簡易"], image_url: "https://kikkomanusa.com/chinese/wp-content/uploads/sites5/2022/01/31040_Chinese-Steamed-Eggs.jpg" },
  { id: 7, name: "魚香茄子", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 180, description: "四川經典小菜，茄子軟糯，魚香浓郁", tags: ["送飯", "簡易"], image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" },
  { id: 8, name: "鼓汁蒸排骨", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 320, description: "廣東經典，豉香浓郁，排骨嫩滑", tags: ["送飯", "簡易"], image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400" },
  { id: 9, name: "韭菜炒蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 150, description: "簡單家常，韭菜香嫩，雞蛋軟滑", tags: ["健康", "簡易"], image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400" },
  { id: 10, name: "咖喱薯仔炆雞翼", cooking_time: 30, difficulty: "中", cuisine: "中式", calories: 380, description: "咖喱香濃，雞翼入味，薯仔軟糯", tags: ["送飯", "咖喱"], image_url: "https://images.unsplash.com/photo-1606152426935-3381f2f6520c?w=400" },
  { id: 11, name: "糖醋排骨", cooking_time: 25, difficulty: "中", cuisine: "中式", calories: 420, description: "酸甜可口，外酥內嫩", tags: ["酸甜", "送飯"], image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400" },
  { id: 12, name: "蒜蓉炒菜心", cooking_time: 8, difficulty: "易", cuisine: "中式", calories: 80, description: "簡單健康，蒜香四溢", tags: ["健康", "簡易"], image_url: "https://images.unsplash.com/photo-1518164147695-36c13dd568f4?w=400" },
  { id: 13, name: "冬菇蒸雞", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 280, description: "廣東經典，菇香雞嫩", tags: ["健康", "送飯"], image_url: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400" },
  { id: 14, name: "紅燒肉", cooking_time: 60, difficulty: "難", cuisine: "中式", calories: 550, description: "上海經典，肥而不膩", tags: ["送飯", "肉類"], image_url: "https://images.unsplash.com/photo-1623689046286-d4ca3f6a9ad4?w=400" },
  { id: 18, name: "滑蛋蝦仁", cooking_time: 12, difficulty: "易", cuisine: "中式", calories: 220, description: "蛋香嫩滑，蝦仁鮮甜", tags: ["健康", "海鮮"], image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400" },
  { id: 19, name: "蒜香雞翼", cooking_time: 25, difficulty: "易", cuisine: "中式", calories: 350, description: "蒜香濃郁，雞翼嫩滑", tags: ["小食", "肉類"], image_url: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400" },
  { id: 20, name: "蠔油芥蘭", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 90, description: "簡單健康，蠔油香濃", tags: ["健康", "蔬菜"], image_url: "https://images.unsplash.com/photo-1518164147695-36c13dd568f4?w=400" },
  { id: 21, name: "西蘭花炒帶子", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 180, description: "海鮮配蔬菜，健康美味", tags: ["健康", "海鮮"], image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400" },
  { id: 23, name: "腐乳通菜", cooking_time: 8, difficulty: "易", cuisine: "中式", calories: 100, description: "簡單惹味，送飯一流", tags: ["送飯", "簡易"], image_url: "https://images.unsplash.com/photo-1518164147695-36c13dd568f4?w=400" }
];

export default function RecipesPage() {
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  return (
    <>
      <Head><title>今晚食乜 - 食譜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        <header style={{ background: colors.cream, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '28px' }}>🥘</span>
            <span style={{ fontSize: '22px', fontWeight: '700', color: colors.brown }}>今晚食乜</span>
          </Link>
          <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <Link href="/" style={{ color: colors.textLight, textDecoration: 'none' }}>首頁</Link>
            <Link href="/generate" style={{ color: colors.text, textDecoration: 'none', fontWeight: '500' }}>生成餐單</Link>
          </nav>
        </header>

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
                    {recipe.tags && recipe.tags.map((tag, i) => (
                      <span key={i} style={{ background: colors.yellow, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedRecipe && (
          <div onClick={() => setSelectedRecipe(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', position: 'relative' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.brown, marginBottom: '12px' }}>{selectedRecipe.name}</h2>
              <p style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>{selectedRecipe.cooking_time}分鐘 · {selectedRecipe.difficulty} · {selectedRecipe.calories} kcal</p>
              <p style={{ fontSize: '14px', color: colors.text, marginBottom: '16px' }}>{selectedRecipe.description}</p>
              <button onClick={() => setSelectedRecipe(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>✕</button>
            </div>
          </div>
        )}

        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
