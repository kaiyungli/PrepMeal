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

const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

// Simple static recipes for fast loading
const sampleRecipes = [
  { id: 4, name: "番茄炒蛋", cooking_time: 5, difficulty: "易", cuisine: "中式", calories: 180, image_url: "https://img.cook1cook.com/upload/cover/15/91/9779914994051761591.jpg" },
  { id: 5, name: "麻婆豆腐", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 280, image_url: "https://www.christinesrecipes.com/wp-content/uploads/2010/01/Mapo-Tofu.jpg" },
  { id: 6, name: "蔥花蒸水蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 120, image_url: "https://kikkomanusa.com/chinese/wp-content/uploads/sites5/2022/01/31040_Chinese-Steamed-Eggs.jpg" },
  { id: 7, name: "魚香茄子", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 180, image_url: "" },
  { id: 8, name: "鼓汁蒸排骨", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 320, image_url: "" },
  { id: 9, name: "韭菜炒蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 150, image_url: "" },
  { id: 10, name: "咖喱薯仔炆雞翼", cooking_time: 30, difficulty: "中", cuisine: "中式", calories: 380, image_url: "" }
];

const recipeIngredients = {
  4: ["番茄 2個", "雞蛋 2隻", "蔥 1棵"],
  5: ["豆腐 1磚", "豬肉碎 100g", "麻辣醬 2湯匙"],
  6: ["雞蛋 3隻", "蔥 2條"],
  7: ["茄子 2條", "豬肉碎 80g"],
  8: ["排骨 300g", "豆鼓 1湯匙"],
  9: ["韭菜 200g", "雞蛋 2隻"],
  10: ["雞翼 4隻", "薯仔 2個", "咖喱磚 1塊"]
};

export async function getServerSideProps(context) {
  return {
    props: {
      cuisine: context.query.cuisine || '',
      time: context.query.time || '',
      difficulty: context.query.difficulty || '',
      servings: context.query.servings || '',
      mealsPerDay: context.query.mealsPerDay || 1
    }
  };
}

export default function MenuPage({ cuisine, time, difficulty, servings, mealsPerDay }) {
  const [allRecipes] = useState(sampleRecipes);
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState(cuisine || '全部');
  const [selectedTime, setSelectedTime] = useState(time || '全部');
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty || '全部');
  const [selectedServings] = useState(parseInt(servings) || 2);
  const [selectedMeals] = useState(parseInt(mealsPerDay) || 1);
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  useEffect(() => {
    generateMenu();
  }, []);

  function generateMenu() {
    let filtered = [...allRecipes];
    if (selectedCuisine !== '全部') filtered = filtered.filter(r => r.cuisine === selectedCuisine);
    if (selectedTime !== '全部') filtered = filtered.filter(r => r.cooking_time <= (selectedTime === '15分鐘' ? 15 : 30));
    if (selectedDifficulty !== '全部') filtered = filtered.filter(r => r.difficulty === selectedDifficulty);

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const mpd = selectedMeals;
    const menu = [];
    
    for (let i = 0; i < 7 * mpd; i++) {
      const dayIndex = Math.floor(i / mpd);
      menu.push({ day: days[dayIndex], ...shuffled[i % shuffled.length], slot: i % mpd });
    }
    setWeeklyMenu(menu);

    // Shopping list
    const list = {};
    menu.forEach(meal => {
      const ings = recipeIngredients[meal.id] || [];
      ings.forEach(ing => {
        if (!list[ing]) list[ing] = { name: ing, count: 1 };
        else list[ing].count++;
      });
    });
    setShoppingList(Object.values(list));
  }

  return (
    <>
      <Head><title>今晚食乜 - 一週餐單</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        <header style={{ background: colors.cream, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '24px' }}>🥘</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: colors.brown }}>今晚食乜</span>
          </Link>
          <Link href="/" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>返回首頁</Link>
        </header>

        <div style={{ background: colors.brown, padding: '24px 40px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, marginBottom: '16px' }}>🔍 搜尋條件</h3>
            <div style={{ display: 'grid', gridTemplateColumns: { base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: colors.textLight, marginBottom: '8px' }}>🥢 邊種菜式</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['全部', '中式', '西式', '日式', '韓式'].map(opt => (
                    <button key={opt} onClick={() => { setSelectedCuisine(opt); setTimeout(generateMenu, 0); }} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: selectedCuisine === opt ? colors.brown : '#f0f0f0', color: selectedCuisine === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: colors.textLight, marginBottom: '8px' }}>⏱️ 煮食時間</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['全部', '15分鐘', '30分鐘'].map(opt => (
                    <button key={opt} onClick={() => { setSelectedTime(opt); setTimeout(generateMenu, 0); }} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: selectedTime === opt ? colors.yellow : '#f0f0f0', color: selectedTime === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: colors.textLight, marginBottom: '8px' }}>💪 難度</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['全部', '易', '中', '難'].map(opt => (
                    <button key={opt} onClick={() => { setSelectedDifficulty(opt); setTimeout(generateMenu, 0); }} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: selectedDifficulty === opt ? colors.yellow : '#f0f0f0', color: selectedDifficulty === opt ? 'white' : colors.text }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: colors.textLight, marginBottom: '8px' }}>👥 幾多人</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[1,2,3,4].map(opt => (
                    <button key={opt} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: selectedServings === opt ? colors.brown : '#f0f0f0', color: selectedServings === opt ? 'white' : colors.text }}>{opt}人</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={generateMenu} style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, background: colors.yellow, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔄 重新生成餐單</button>
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.brown, marginBottom: '8px', textAlign: 'center' }}>一週餐單</h1>
          <p style={{ textAlign: 'center', color: colors.textLight, marginBottom: '32px' }}>{selectedServings}人份 · 每日{selectedMeals}餐</p>

          {/* Timeline Style */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '40px' }}>
            {weeklyMenu.map((meal, index) => (
              <div key={index} style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: colors.yellow, border: '3px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 1 }} />
                  {index < weeklyMenu.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e5e5e5', marginTop: '4px' }} />}
                </div>
                <div style={{ flex: 1, background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: index < weeklyMenu.length - 1 ? '16px' : '0' }}>
                  <div style={{ height: '80px', background: meal.image_url ? `url(${meal.image_url})` : '#f5f5f5', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: '12px' }}>
                    <span style={{ background: colors.brown, color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '11px' }}>{meal.day}</span>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: colors.brown, margin: '8px 0 4px' }}>{meal.name}</h3>
                    <p style={{ fontSize: '12px', color: colors.textLight }}>{meal.cooking_time}分鐘 · {meal.difficulty}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.brown, marginBottom: '20px' }}>🛒 食材清單 ({selectedServings}人份)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {shoppingList.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#faf8f5', borderRadius: '8px' }}>
                  <span style={{ color: colors.text }}>{item.name.split(' ')[1] || item.name}</span>
                  <span style={{ color: colors.textLight, fontSize: '13px' }}>{item.name.split(' ')[0]}</span>
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
  );
}
