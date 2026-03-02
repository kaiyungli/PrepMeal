'use client';
import { useState } from 'react';
import Head from 'next/head';
import { generateWeeklyMenu, generateShoppingList } from '../data/meals';

const colors = {
  primary: '#2A9D8F',
  secondary: '#E76F51',
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6B7280',
  border: '#E5E7EB',
};

export default function Home() {
  const [mealType, setMealType] = useState('dinner');
  const [menu, setMenu] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [view, setView] = useState('home');

  function handleGenerate() {
    const weeklyMenu = generateWeeklyMenu(mealType);
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
        background: colors.background,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {/* Hero Section */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          padding: '80px 20px 60px',
          textAlign: 'center',
        }}>
          <h1 style={{ 
            fontSize: '56px', 
            fontWeight: '800', 
            color: 'white',
            marginBottom: '16px',
            letterSpacing: '-1px'
          }}>
            今晚食乜
          </h1>
          <p style={{ 
            opacity: 0.95, 
            fontSize: '20px', 
            color: 'white',
            fontWeight: '500'
          }}>
            每日晚餐話你知
          </p>
          <button
            onClick={handleGenerate}
            style={{
              marginTop: '32px',
              padding: '18px 48px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'white',
              color: colors.primary,
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.25)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
            }}
          >
            開始整 🍳
          </button>
        </div>

        {/* Benefits */}
        <div style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { icon: '⏱️', title: '30分鐘晚餐', desc: '適合忙碌既人' },
              { icon: '🥗', title: '營養均衡', desc: '健康選擇' },
              { icon: '🤔', title: '唔洗諗', desc: '一click就有' },
            ].map((item, i) => (
              <div key={i} style={{ 
                textAlign: 'center', 
                padding: '32px 24px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: '40px' }}>{item.icon}</span>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '16px 0 8px', color: colors.text }}>{item.title}</h3>
                <p style={{ fontSize: '14px', color: colors.textLight }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div style={{ textAlign: 'center', padding: '20px', marginBottom: '40px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
            👍 已有 1,000+ 人使用
          </p>
        </div>

        {/* FAQ */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px', maxWidth: '600px', margin: '0 auto 60px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '32px', textAlign: 'center', color: colors.text }}>常見問題</h2>
          {[
            { q: '整一個餐單幾耐？', a: '1分鐘就搞掂，一click生成7日晚餐' },
            { q: '需要幾多材料？', a: '超市買到，最平$50整一日三餐' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: colors.text }}>{item.q}</h4>
              <p style={{ fontSize: '15px', color: colors.textLight, lineHeight: '1.6' }}>{item.a}</p>
            </div>
          ))}
        </div>

        {/* Generated Menu View */}
        {view === 'menu' && menu && (
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
            {/* Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              marginBottom: '32px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setView('menu')}
                style={{
                  padding: '14px 32px',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: view === 'menu' ? colors.primary : 'white',
                  color: view === 'menu' ? 'white' : colors.textLight,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                }}
              >
                🍽️ 餐單
              </button>
              <button
                onClick={() => setView('shopping')}
                style={{
                  padding: '14px 32px',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: view === 'shopping' ? colors.secondary : 'white',
                  color: view === 'shopping' ? 'white' : colors.textLight,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                }}
              >
                🛒 食材
              </button>
            </div>

            {/* Menu View */}
            {view === 'menu' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {menu.map((meal, index) => (
                  <div key={index} style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    position: 'relative',
                  }}>
                    <span style={{
                      background: colors.primary,
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][index]}
                    </span>
                    <h3 style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      margin: '16px 0',
                      color: colors.text 
                    }}>
                      {meal.name}
                    </h3>
                    <button
                      onClick={() => regenerateDay(index)}
                      style={{
                        background: 'transparent',
                        border: `2px solid ${colors.border}`,
                        color: colors.textLight,
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      🔄 轉另一款
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Shopping List View */}
            {view === 'shopping' && shoppingList && (
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', color: colors.text }}>
                  🛒 食材清單
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {shoppingList.map((item, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '16px',
                      background: colors.background,
                      borderRadius: '12px',
                    }}>
                      <span style={{ fontWeight: '500', color: colors.text }}>{item.name}</span>
                      <span style={{ color: colors.textLight }}>x{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Another */}
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button
                onClick={handleGenerate}
                style={{
                  padding: '16px 40px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(42, 157, 143, 0.3)',
                }}
              >
                🔄 重新生成
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: '14px' }}>© 2026 今晚食乜 Made with ❤️</p>
        </div>
      </div>
    </>
  );
}
