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

// Static recipe data
const allRecipes = [
  { id: 1, name: "壽喜燒牛丼", cooking_time: 15, difficulty: "易", cuisine: "日式", calories: 450, image_url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400", tags: ["送飯", "簡易"], description: "日式既牛肉蓋飯", instructions: ["洋蔥切絲", "煮醬汁", "加入牛肉", "燜10分鐘"] },
  { id: 2, name: "咖喱雞", cooking_time: 40, difficulty: "中", cuisine: "中式", calories: 520, image_url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400", tags: ["送飯", "辣"], description: "濃郁咖喱味", instructions: ["醃雞肉", "炒香洋蔥", "加入咖喱醬", "燜30分鐘"] },
  { id: 3, name: "蕃茄烤雞", cooking_time: 45, difficulty: "中", cuisine: "西式", calories: 380, image_url: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400", tags: ["健身", "健康"], description: "健康既蕃茄烤雞", instructions: ["醃雞肉", "鋪上蕃茄", "放入焗爐", "烤35分鐘"] }
]

const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

export default function MenuPage({ weeklyMenu: initialMenu, shoppingList: initialList }) {
  const [weeklyMenu, setWeeklyMenu] = useState(initialMenu || [])
  const [shoppingList, setShoppingList] = useState(initialList || [])
  const [selectedDay, setSelectedDay] = useState(null)

  // Generate menu if not provided
  useEffect(() => {
    if (!weeklyMenu || weeklyMenu.length === 0) {
      generateMenu()
    }
  }, [])

  function generateMenu() {
    const shuffled = [...allRecipes].sort(() => 0.5 - Math.random())
    const menu = shuffled.slice(0, 7).map((r, i) => ({
      day: days[i],
      ...r
    }))
    setWeeklyMenu(menu)
    
    // Generate shopping list
    const list = {}
    menu.forEach(meal => {
      if (!list[meal.name]) {
        list[meal.name] = { name: meal.name, count: 1 }
      } else {
        list[meal.name].count++
      }
    })
    setShoppingList(Object.values(list))
  }

  function regenerateDay(dayIndex) {
    const used = new Set(weeklyMenu.map(m => m.name))
    let newRecipe
    let attempts = 0
    do {
      newRecipe = allRecipes[Math.floor(Math.random() * allRecipes.length)]
      attempts++
    } while (used.has(newRecipe.name) && attempts < 20)
    
    const newMenu = [...weeklyMenu]
    newMenu[dayIndex] = { day: days[dayIndex], ...newRecipe }
    setWeeklyMenu(newMenu)
    
    // Update shopping list
    const list = {}
    newMenu.forEach(meal => {
      if (!list[meal.name]) {
        list[meal.name] = { name: meal.name, count: 1 }
      } else {
        list[meal.name].count++
      }
    })
    setShoppingList(Object.values(list))
  }

  return (
    <>
      <Head>
        <title>今晚食乜 - 一週餐單</title>
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

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown, marginBottom: '8px', textAlign: 'center' }}>
            一週餐單
          </h1>
          <p style={{ textAlign: 'center', color: colors.textLight, marginBottom: '32px' }}>
            每日晚餐話你知
          </p>

          {/* Weekly Menu Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            {weeklyMenu.map((meal, index) => (
              <div key={index} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                <div style={{ height: '120px', background: meal.image_url ? `url(${meal.image_url})` : '#f0f0f0', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ padding: '16px' }}>
                  <span style={{ background: colors.brown, color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>{meal.day}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, margin: '12px 0 8px' }}>{meal.name}</h3>
                  <p style={{ fontSize: '13px', color: colors.textLight }}>{meal.cooking_time}分鐘 · {meal.difficulty} · {meal.calories} kcal</p>
                  <button onClick={() => regenerateDay(index)} style={{ marginTop: '12px', width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${colors.brown}`, color: colors.brown, borderRadius: '8px', cursor: 'pointer' }}>
                    🔄 轉另一款
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Shopping List */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: colors.brown, marginBottom: '20px' }}>🛒 食材清單</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {shoppingList.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: colors.lightBg, borderRadius: '8px' }}>
                  <span style={{ color: colors.text }}>{item.name}</span>
                  <span style={{ color: colors.textLight }}>x{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regenerate All Button */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button onClick={generateMenu} style={{ padding: '14px 32px', background: colors.yellow, color: 'white', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              🔄 重新生成
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  )
}
