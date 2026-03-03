import { useState, useEffect } from 'react';
import Link from 'next/link';
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

// All recipes (could be from API in future)
const allRecipes = [
  { id: 1, name: "番茄炒蛋", cooking_time: 15, difficulty: "易", cuisine: "中式", calories: 180, image_url: "", tags: ["送飯", "簡易"], description: "簡單美味既家常菜", instructions: ["番茄切塊", "蛋發勻", "炒蛋", "加入番茄"] },
  { id: 2, name: "麻婆豆腐", cooking_time: 25, difficulty: "中", cuisine: "中式", calories: 280, image_url: "", tags: ["辣", "送飯"], description: "麻辣惹味既豆腐料理", instructions: ["豆腐切塊", "炒肉碎", "加入麻辣醬", "燜煮"] },
  { id: 3, name: "蔥花蒸水蛋", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 120, image_url: "", tags: ["健康", "簡易"], description: "嫩滑既蒸水蛋", instructions: ["蛋發勻", "加入蔥花", "加水調味", "蒸10分鐘"] }
]

const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

export default function MenuPage() {
  const router = useRouter()
  const { cuisine, time, difficulty, servings } = router.query
  
  const [weeklyMenu, setWeeklyMenu] = useState([])
  const [shoppingList, setShoppingList] = useState([])
  const [selectedFilters, setSelectedFilters] = useState({})

  useEffect(() => {
    // Get filters from URL
    const filters = {
      cuisine: cuisine || '全部',
      time: time || '全部',
      difficulty: difficulty || '全部',
      servings: parseInt(servings) || 2
    }
    setSelectedFilters(filters)
    generateMenu(filters)
  }, [cuisine, time, difficulty, servings])

  function generateMenu(filters) {
    // Filter recipes based on user selection
    let filtered = [...allRecipes]
    
    if (filters.cuisine && filters.cuisine !== '全部') {
      filtered = filtered.filter(r => r.cuisine === filters.cuisine)
    }
    
    if (filters.time && filters.time !== '全部') {
      const timeMap = { '15分鐘': 15, '30分鐘': 30, '1小時': 60 }
      const maxTime = timeMap[filters.time] || 60
      filtered = filtered.filter(r => r.cooking_time <= maxTime)
    }
    
    if (filters.difficulty && filters.difficulty !== '全部') {
      filtered = filtered.filter(r => r.difficulty === filters.difficulty)
    }
    
    // If not enough recipes, add more from all (with limit to prevent infinite loop)
    let attempts = 0
    while (filtered.length < 7 && attempts < 10) {
      const more = allRecipes.filter(r => !filtered.find(f => f.id === r.id))
      if (more.length === 0) break
      filtered = [...filtered, ...more]
      attempts++
    }
    
    // Shuffle and pick 7
    const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 7)
    const menu = shuffled.map((r, i) => ({ day: days[i], ...r }))
    setWeeklyMenu(menu)
    
    // Shopping list
    const list = {}
    menu.forEach(meal => {
      if (!list[meal.name]) {
        list[meal.name] = { name: meal.name, count: filters.servings || 2 }
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
    
    const list = {}
    newMenu.forEach(meal => {
      if (!list[meal.name]) {
        list[meal.name] = { name: meal.name, count: selectedFilters.servings || 2 }
      }
    })
    setShoppingList(Object.values(list))
  }

  function regenerateAll() {
    generateMenu(selectedFilters)
  }

  return (
    <>
      <Head>
        <title>今晚食乜 - 一週餐單</title>
      </Head>

      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <header style={{ background: colors.cream, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '24px' }}>🥘</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.brown }}>今晚食乜</span>
          </Link>
          <Link href="/" style={{ color: colors.text, textDecoration: 'none', fontWeight: '500' }}>返回首頁</Link>
        </header>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown, marginBottom: '8px', textAlign: 'center' }}>
            一週餐單
          </h1>
          <p style={{ textAlign: 'center', color: colors.textLight, marginBottom: '24px' }}>
            {selectedFilters.cuisine && selectedFilters.cuisine !== '全部' && `口味: ${selectedFilters.cuisine} · `}
            {selectedFilters.time && selectedFilters.time !== '全部' && `時間: ${selectedFilters.time}內 · `}
            {selectedFilters.difficulty && selectedFilters.difficulty !== '全部' && `難度: ${selectedFilters.difficulty} · `}
            {selectedFilters.servings && `${selectedFilters.servings}人份`}
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: colors.brown, marginBottom: '20px' }}>🛒 食材清單 ({selectedFilters.servings || 2}人份)</h2>
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
            <button onClick={regenerateAll} style={{ padding: '14px 32px', background: colors.yellow, color: 'white', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
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
