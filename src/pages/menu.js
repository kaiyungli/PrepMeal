'use client';
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

// Recipes fetched from API

const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
const cuisineOptions = ['全部', '中式', '西式', '日式', '韓式', '素食'];
const timeOptions = ['全部', '15分鐘', '30分鐘'];
const difficultyOptions = ['全部', '易', '中', '難'];
const servingOptions = [1, 2, 3, 4];

export default function MenuPage({ cuisine: initialCuisine, time: initialTime, difficulty: initialDifficulty, servings: initialServings }) {
  const [allRecipes, setAllRecipes] = useState([]);
  
  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => {
        setAllRecipes(data.recipes || []);
        // Generate menu after recipes loaded
        setTimeout(() => {
          let filtered = [...(data.recipes || [])];
          const shuffled = filtered.sort(() => 0.5 - Math.random());
          const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
          const menu = [];
          for (let i = 0; i < 7; i++) {
            menu.push({ day: days[i], ...shuffled[i % shuffled.length] });
          }
          setWeeklyMenu(menu);
          
          // Shopping list
          const recipeIngredients = {
            4: ["番茄 2個", "雞蛋 2隻", "蔥 1棵"],
            5: ["豆腐 1磚", "豬肉碎 100g", "麻辣醬 2湯匙"],
            6: ["雞蛋 3隻", "蔥 2條"],
            7: ["茄子 2條", "豬肉碎 80g"],
            8: ["排骨 300g", "豆鼓 1湯匙"],
            9: ["韭菜 200g", "雞蛋 2隻"],
            10: ["雞翼 4隻", "薯仔 2個", "咖喱磚 1塊"],
            11: ["排骨 300g", "白醋 3湯匙", "糖 2湯匙"],
            12: ["菜心 300g", "蒜頭 3瓣"],
            13: ["雞 半隻", "冬菇 5朵"],
            14: ["五花肉 500g", "糖 3湯匙"],
            18: ["蝦仁 150g", "雞蛋 3隻"],
            19: ["雞翼 6隻", "蒜頭 4瓣"],
            20: ["芥蘭 300g", "蠔油 2湯匙"],
            21: ["西蘭花 1棵", "帶子 150g"],
            23: ["通菜 300g", "腐乳 2件"]
          };
          const list = {};
          menu.forEach(meal => {
            const ings = recipeIngredients[meal.id] || [];
            ings.forEach(ing => {
              if (!list[ing]) list[ing] = { name: ing, count: 1 };
              else list[ing].count++;
            });
          });
          setShoppingList(Object.values(list));
        }, 100);
      })
      .catch(() => {});
  }, []);
  const [cuisine, setCuisine] = useState(initialCuisine || '全部');
  const [time, setTime] = useState(initialTime || '全部');
  const [difficulty, setDifficulty] = useState(initialDifficulty || '全部');
  const [servings, setServings] = useState(parseInt(initialServings) || 2);
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);

  // Generate menu function
  // Ingredients for each recipe
const recipeIngredients = {
  4: ["番茄 2個", "雞蛋 2隻", "蔥 1棵", "鹽 少許"],
  5: ["豆腐 1磚", "豬肉碎 100g", "麻辣醬 2湯匙", "蒜頭 2瓣"],
  6: ["雞蛋 3隻", "蔥 2條", "鹽 少許", "鼓油 1湯匙"],
  7: ["茄子 2條", "豬肉碎 80g", "蒜頭 3瓣", "豆瓣醬 1湯匙"],
  8: ["排骨 300g", "豆鼓 1湯匙", "蒜頭 2瓣", "鼓油 2湯匙"],
  9: ["韭菜 200g", "雞蛋 2隻", "鹽 少許"],
  10: ["雞翼 4隻", "薯仔 2個", "咖喱磚 1塊", "洋蔥 1個"],
  11: ["排骨 300g", "白醋 3湯匙", "糖 2湯匙", "茄汁 2湯匙"],
  12: ["菜心 300g", "蒜頭 3瓣", "蠔油 2湯匙"],
  13: ["雞 半隻", "冬菇 5朵", "薑 3片", "鼓油 2湯匙"],
  14: ["五花肉 500g", "糖 3湯匙", "生抽 2湯匙", "老抽 1湯匙"],
  18: ["蝦仁 150g", "雞蛋 3隻", "鹽 少許"],
  19: ["雞翼 6隻", "蒜頭 4瓣", "鹽 少許"],
  20: ["芥蘭 300g", "蠔油 2湯匙", "蒜頭 2瓣"],
  21: ["西蘭花 1棵", "帶子 150g", "蒜頭 2瓣", "鹽 少許"],
  23: ["通菜 300g", "腐乳 2件", "蒜頭 3瓣", "辣椒 1隻"]
};

  const generateMenu = () => {
    let filtered = [...allRecipes];
    if (cuisine !== '全部') filtered = filtered.filter(r => r.cuisine === cuisine);
    if (time !== '全部') filtered = filtered.filter(r => r.cooking_time <= (time === '15分鐘' ? 15 : 30));
    if (difficulty !== '全部') filtered = filtered.filter(r => r.difficulty === difficulty);

    // Fill up to 7 days with unique recipes (shuffle first)
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    let menu = [];
    for (let i = 0; i < 7; i++) {
      menu.push({ day: days[i], ...shuffled[i % shuffled.length] });
    }
    setWeeklyMenu(menu);

    // Shopping list with ingredients
    const list = {};
    menu.forEach(meal => {
      const ingredients = recipeIngredients[meal.id] || [];
      ingredients.forEach(ing => {
        const name = ing.replace(/[0-9]/g, '').trim();
        if (!list[name]) list[name] = { name: ing, count: 1 };
        else list[name].count++;
      });
    });
    setShoppingList(Object.values(list));
  };

  // Generate on mount
  useEffect(() => { generateMenu(); }, [allRecipes]);

  const regenerateDay = (dayIndex) => {
    const newMenu = [...weeklyMenu];
    const newRecipe = allRecipes[Math.floor(Math.random() * allRecipes.length)];
    newMenu[dayIndex] = { day: days[dayIndex], ...newRecipe };
    setWeeklyMenu(newMenu);
  };

  return (
    <>
      <Head><title>今晚食乜 - 一週餐單</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        <header style={{ background: colors.cream, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '24px' }}>🥘</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.brown }}>今晚食乜</span>
          </Link>
          <Link href="/" style={{ color: colors.text, textDecoration: 'none', fontWeight: '500' }}>返回首頁</Link>
        </header>

        {/* Filter Section - Always Visible */}
        <div style={{ background: colors.brown, padding: '24px 40px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>🔍 搜尋條件</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.textLight, marginBottom: '8px' }}>🥢 邊種菜式</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {cuisineOptions.map((opt) => (
                    <button key={opt} onClick={() => { setCuisine(opt); setTimeout(generateMenu, 0); }} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: cuisine === opt ? colors.brown : '#f0f0f0', color: cuisine === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.textLight, marginBottom: '8px' }}>⏱️ 煮食時間</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {timeOptions.map((opt) => (
                    <button key={opt} onClick={() => { setTime(opt); setTimeout(generateMenu, 0); }} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: time === opt ? colors.yellow : '#f0f0f0', color: time === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.textLight, marginBottom: '8px' }}>💪 難度</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {difficultyOptions.map((opt) => (
                    <button key={opt} onClick={() => { setDifficulty(opt); setTimeout(generateMenu, 0); }} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: difficulty === opt ? colors.yellow : '#f0f0f0', color: difficulty === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.textLight, marginBottom: '8px' }}>👥 幾多人</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {servingOptions.map((opt) => (
                    <button key={opt} onClick={() => { setServings(opt); setTimeout(generateMenu, 0); }} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: servings === opt ? colors.brown : '#f0f0f0', color: servings === opt ? 'white' : colors.text }}>{opt}人</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={generateMenu} style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: '600', background: colors.yellow, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔄 重新生成餐單</button>
          </div>
        </div>

        {/* Weekly Menu */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown, marginBottom: '8px', textAlign: 'center' }}>一週餐單</h1>
          <p style={{ textAlign: 'center', color: colors.textLight, marginBottom: '32px' }}>
            {cuisine !== '全部' && `${cuisine} · `}{time !== '全部' && `${time}內 · `}{difficulty !== '全部' && `${difficulty} · `}{servings}人份
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            {weeklyMenu.map((meal, index) => (
              <div key={index} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                <div style={{ height: '120px', background: meal.image_url ? `url(${meal.image_url})` : '#f0f0f0', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!meal.image_url && <span style={{ fontSize: '40px' }}>🍳</span>}
                </div>
                <div style={{ padding: '16px' }}>
                  <span style={{ background: colors.brown, color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>{meal.day}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, margin: '12px 0 8px' }}>{meal.name}</h3>
                  <p style={{ fontSize: '13px', color: colors.textLight }}>{meal.cooking_time}分鐘 · {meal.difficulty} · {meal.calories} kcal</p>
                  <button onClick={() => regenerateDay(index)} style={{ marginTop: '12px', width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${colors.brown}`, color: colors.brown, borderRadius: '8px', cursor: 'pointer' }}>🔄 轉另一款</button>
                </div>
              </div>
            ))}
          </div>

          {/* Shopping List */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: colors.brown, marginBottom: '20px' }}>🛒 食材清單 ({servings}人份)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {shoppingList.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#faf8f5", borderRadius: "8px" }}>
            <span style={{ color: "#264653" }}>{item.name.split(' ')[1] || item.name}</span>
            <span style={{ color: "#6b7280", fontSize: "13px" }}>{item.name.split(' ')[0]}</span>
          </div>
        ))}
            </div>
          </div>
        </div>

        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  )
}
export const dynamic = 'force-dynamic'
