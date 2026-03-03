'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { generateShoppingList } from '../data/meals';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  yellow: '#E76F51',
  lightBg: '#faf8f5',
  text: '#264653',
  textLight: '#6b7280',
};

const categories = [
  { name: '中式', icon: '🥢' },
  { name: '西式', icon: '🍝' },
  { name: '日式', icon: '🍣' },
  { name: '韓式', icon: '🥘' },
  { name: '素食', icon: '🥗' },
];

export default function Home() {
  useEffect(() => {
    async function fetchRecipes() {
      try {
        const res = await fetch('/api/recipes?limit=50');
        const data = await res.json();
        if (data.recipes && data.recipes.length > 0) {
          setRecipes(data.recipes);
        }
      } catch (err) {
        console.error('Error fetching recipes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecipes();
  }, []);

  const [mealType, setMealType] = useState('dinner');
  const [menu, setMenu] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [view, setView] = useState('home');
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cuisineFilter, setCuisineFilter] = useState('全部');
  const [timeFilter, setTimeFilter] = useState('全部');
  const [equipmentFilter, setEquipmentFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [flavorFilter, setFlavorFilter] = useState('全部');
  const [difficultyFilter, setDifficultyFilter] = useState('全部');
  const [filterExpanded, setFilterExpanded] = useState(true);

  const flavorOptions = ['全部', '中式', '西式', '日式', '韓式', '素食'];
  const difficultyOptions = ['全部', '易', '中', '難'];

  const cuisineOptions = ['全部', '中式', '西式', '日式', '韓式'];
  const timeOptions = ['全部', '15分鐘', '30分鐘', '1小時'];
  const equipmentOptions = ['全部', '微波爐', '焗爐', '氣炸鍋', '明火'];

  function handleGenerate() {
    // Use recipes from database if available, otherwise fallback to mock
    let availableRecipes = (recipes || []).length > 0 ? recipes : [];
    
    // Apply filters
    let filtered = availableRecipes;
    if (cuisineFilter !== '全部') {
      filtered = filtered.filter(r => r.cuisine === cuisineFilter);
    }
    if (timeFilter !== '全部') {
      const timeMap = { '15分鐘': 15, '30分鐘': 30, '1小時': 60 };
      filtered = filtered.filter(r => r.cooking_time <= timeMap[timeFilter]);
    }
    
    // Get 7 random recipes
    const shuffled = [...(filtered || [])].sort(() => 0.5 - Math.random());
    const weeklyMenu = shuffled.slice(0, 7).map(r => ({
      name: r.name,
      cuisine: r.cuisine,
      cooking_time: r.cooking_time,
      difficulty: r.difficulty,
      image_url: r.image_url,
    }));
    
    setMenu(weeklyMenu);
    setShoppingList(generateShoppingList(weeklyMenu));
    setView('menu');
  }

  function regenerateDay(dayIndex) {
    const meals = mealType === 'dinner' 
      ? require('../data/meals').MEALS.dinner 
      : require('../data/meals').MEALS.lunch;
    
    const newMenu = [...menu];
    const used = new Set(newMenu.map(m => m.name));
    
    let meal;
    let attempts = 0;
    do {
      meal = meals[Math.floor(Math.random() * meals.length)];
      attempts++;
    } while (used.has(meal.name) && attempts < 20);
    
    newMenu[dayIndex] = { ...menu[dayIndex], ...meal };
    setMenu(newMenu);
    setShoppingList(generateShoppingList(newMenu));
  }

  return (
    <>
      <Head>
        <title>今晚食乜 🥘</title>
        <meta name="description" content="Generate weekly meal plan" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: colors.cream,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {/* Header */}
        <header style={{
          background: colors.cream,
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e5e5',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🥘</span>
            <span style={{ fontSize: '22px', fontWeight: '700', color: colors.brown }}>今晚食乜</span>
          </div>
          <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#" style={{ color: colors.text, textDecoration: 'none', fontWeight: '500' }}>首頁</a>
            <a href="#" style={{ color: colors.textLight, textDecoration: 'none' }}>食譜</a>
            <a href="#" style={{ color: colors.textLight, textDecoration: 'none' }}>關於</a>
            <button style={{
              background: colors.yellow,
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              fontWeight: '600',
              cursor: 'pointer',
            }}>
              開始整
            </button>
          </nav>
        </header>

        {/* Hero Section */}
        <section style={{
          background: colors.lightBg,
          padding: '80px 40px',
          textAlign: 'center',
        }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '800', 
            color: colors.brown,
            marginBottom: '16px',
          }}>
            今晚食乜？
          </h1>
          <p style={{ 
            fontSize: '20px', 
            color: colors.textLight,
            marginBottom: '32px',
          }}>
            每日晚餐話你知，一click生成一週餐單
          </p>
          <button
            onClick={handleGenerate}
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: '600',
              background: colors.yellow,
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
            }}
          >
            開始整 🍳
          </button>
        </section>

        {/* Filters */}
        <section style={{ padding: '20px 40px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', 
            background: 'white', 
            borderRadius: '16px', 
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            maxHeight: filterExpanded ? '2000px' : '100px',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.brown }}>🔍 篩選條件</h3>
              <button onClick={() => setFilterExpanded(!filterExpanded)} style={{ padding: '8px 12px', border: 'none', background: '#f0f0f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                {filterExpanded ? '收起 ▲' : '展開 ▼'}
              </button>
            </div>
            
            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="搜尋食譜..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e5e5e5',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            
            {/* Time Filter */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>
                ⏱️ 烹飪時間
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {timeOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setTimeFilter(opt)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: timeFilter === opt ? colors.yellow : '#f0f0f0',
                      color: timeFilter === opt ? 'white' : colors.text,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Flavor Filter */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>
                口味
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {flavorOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFlavorFilter(opt)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: flavorFilter === opt ? colors.brown : '#f0f0f0',
                      color: flavorFilter === opt ? 'white' : colors.text,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Difficulty Filter */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>
                難度
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {difficultyOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDifficultyFilter(opt)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: difficultyFilter === opt ? colors.yellow : '#f0f0f0',
                      color: difficultyFilter === opt ? 'white' : colors.text,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Equipment Filter */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: colors.text, marginBottom: '10px' }}>
                🍳 烹飪設備
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {equipmentOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setEquipmentFilter(opt)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: equipmentFilter === opt ? colors.brown : '#f0f0f0',
                      color: equipmentFilter === opt ? 'white' : colors.text,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* Menu Grid (Home View) */}
        {view === 'home' && (
          <section style={{ padding: '20px 40px', maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: colors.brown,
              marginBottom: '24px',
            }}>
              熱門食譜
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '20px',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '32px' }}>🍳</div>
              <p style={{ color: colors.textLight }}>載入中...</p>
            </div>
          ) : ((recipes || []).length > 0 ? recipes.slice(0, 6) : []).map((meal, i) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                }}>
                  <div style={{
                    height: '140px',
                    background: meal.image_url ? `url(${meal.image_url})` : `linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }} />
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: colors.brown,
                      marginBottom: '6px',
                    }}>
                      {meal.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: colors.textLight, marginBottom: '8px' }}>
                      {meal.cooking_time}分鐘 · {meal.cuisine}{(meal?.calories) && ` · ${meal.calories} kcal`}
                    </p>
                    {(meal?.tags?.length > 0) && (
                      <div style={{ marginBottom: '8px' }}>
                        {meal.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} style={{ 
                            display: 'inline-block',
                            background: colors.yellow, 
                            color: 'white', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px',
                            marginRight: '4px',
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {meal.description && (
                      <p style={{ fontSize: '12px', color: colors.textLight, marginBottom: '12px', lineHeight: '1.4' }}>
                        {meal.description}
                      </p>
                    )}
                    <button onClick={async () => {
                      setSelectedRecipe({ ...meal, loadingDetails: true });
                      try {
                        const res = await fetch('/api/recipes/' + meal.id);
                        const data = await res.json();
                        if (data.recipe) {
                          setSelectedRecipe({ ...meal, ...data.recipe, loadingDetails: false });
                        }
                      } catch (e) {
                        setSelectedRecipe({ ...meal, loadingDetails: false });
                      }
                    }} style={{
                      width: '100%',
                      padding: '10px',
                      background: 'transparent',
                      border: `1px solid ${colors.brown}`,
                      color: colors.brown,
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}>
                      查看更多
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Generated Menu View */}
        {view === 'menu' && menu && (
          <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', justifyContent: 'center' }}>
              <button
                onClick={() => setView('menu')}
                style={{
                  padding: '14px 32px',
                  borderRadius: '30px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: view === 'menu' ? colors.brown : 'white',
                  color: view === 'menu' ? 'white' : colors.textLight,
                  border: view === 'menu' ? 'none' : '1px solid #e5e5e5',
                }}
              >
                🍽️ 餐單
              </button>
              <button
                onClick={() => setView('shopping')}
                style={{
                  padding: '14px 32px',
                  borderRadius: '30px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: view === 'shopping' ? colors.yellow : 'white',
                  color: view === 'shopping' ? 'white' : colors.textLight,
                }}
              >
                🛒 食材
              </button>
            </div>

            {/* Menu Grid */}
            {view === 'menu' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {menu.map((meal, index) => (
                  <div key={index} style={{
                    background: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{
                      height: '160px',
                      background: meal.image_url ? `url(${meal.image_url})` : `linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '40px',
                    }}>
                      🍽️
                    </div>
                    <div style={{ padding: '20px' }}>
                      <span style={{
                        background: colors.brown,
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        {['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][index]}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '12px 0', color: colors.brown }}>
                        {meal.name}
                      </h3>
                      <button
                        onClick={() => regenerateDay(index)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${colors.brown}`,
                          color: colors.brown,
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        🔄 轉另一款
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shopping List */}
            {view === 'shopping' && shoppingList && (
              <div style={{
                background: 'white',
                border: 'none',
                padding: '32px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              }}>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', color: colors.brown }}>
                  🛒 食材清單
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {shoppingList.map((item, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '16px',
                      background: colors.lightBg,
                      borderRadius: '12px',
                    }}>
                      <span style={{ fontWeight: '500', color: colors.brown }}>{item.name}</span>
                      <span style={{ color: colors.textLight }}>x{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate Button */}
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button
                onClick={handleGenerate}
                style={{
                  padding: '14px 36px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: colors.brown,
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  cursor: 'pointer',
                }}
              >
                🔄 重新生成
              </button>
            </div>
          </section>
        )}

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}>
              {(selectedRecipe?.image_url) && (
                <div style={{
                  height: '250px',
                  background: `url(${selectedRecipe.image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              )}
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.brown, marginBottom: '12px' }}>
                  {selectedRecipe.name}
                  {selectedRecipe.loadingDetails && <span style={{ fontSize: '14px', color: colors.textLight }}> (載入中...)</span>}
                </h2>
                <p style={{ fontSize: '14px', color: colors.textLight, marginBottom: '16px' }}>
                  {selectedRecipe.cooking_time}分鐘 · {selectedRecipe.difficulty} · {selectedRecipe.cuisine}
                  {selectedRecipe.calories && ` · ${selectedRecipe.calories} kcal`}
                </p>
                {(selectedRecipe?.tags?.length > 0) && (
                  <div style={{ marginBottom: '16px' }}>
                    {selectedRecipe.tags.map((tag, idx) => (
                      <span key={idx} style={{ 
                        display: 'inline-block',
                        background: colors.yellow, 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        marginRight: '8px',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {(selectedRecipe?.description) && (
                  <p style={{ fontSize: '14px', color: colors.text, marginBottom: '20px', lineHeight: '1.6' }}>
                    {selectedRecipe.description}
                  </p>
                )}
                
                {/* Instructions */}
                {(() => {
                  const instructions = selectedRecipe?.instructions;
                  if (!instructions) return null;
                  const steps = Array.isArray(instructions) 
                    ? instructions 
                    : instructions.split(/\d+\.?/).filter(s => s.trim());
                  if (!steps || steps.length === 0) return null;
                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, marginBottom: '12px' }}>做法</h4>
                      <ol style={{ paddingLeft: '20px', margin: 0 }}>
                        {steps.map((step, idx) => (
                          <li key={idx} style={{ fontSize: '14px', color: colors.text, marginBottom: '8px', lineHeight: '1.5' }}>
                            {step.trim()}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })()}
                
                <button 
                  onClick={() => setSelectedRecipe(null)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '20px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: colors.textLight, 
          borderTop: '1px solid #e5e5e5',
          background: colors.lightBg,
        }}>
          <p style={{ fontSize: '14px' }}>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
