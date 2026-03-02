'use client';
import { useState } from 'react';
import Head from 'next/head';
import { generateWeeklyMenu, generateShoppingList } from '../data/meals';

export default function Home() {
  const [mealType, setMealType] = useState('dinner');
  const [menu, setMenu] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [view, setView] = useState('menu');

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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', paddingTop: '40px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>今晚食乜</h1>
          <p style={{ opacity: 0.9, fontSize: '18px' }}>一週晚餐/午餐建議</p>
        </div>

        {/* Controls */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          maxWidth: '600px',
          margin: '0 auto 40px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}>
          {/* Meal Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#333' }}>
              選擇餐類
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setMealType('dinner')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: mealType === 'dinner' ? '#667eea' : '#f0f0f0',
                  color: mealType === 'dinner' ? 'white' : '#333',
                }}
              >
                🍽️ 晚餐
              </button>
              <button
                onClick={() => setMealType('lunch')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: mealType === 'lunch' ? '#667eea' : '#f0f0f0',
                  color: mealType === 'lunch' ? 'white' : '#333',
                }}
              >
                🥗 午餐
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            }}
          >
            🎲 生成一週餐單
          </button>
        </div>

        {/* Tabs */}
        {menu && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => setView('menu')}
              style={{
                padding: '12px 24px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                background: view === 'menu' ? 'white' : 'transparent',
                color: view === 'menu' ? '#667eea' : 'white',
              }}
            >
              📋 餐單
            </button>
            <button
              onClick={() => setView('shopping')}
              style={{
                padding: '12px 24px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                background: view === 'shopping' ? 'white' : 'transparent',
                color: view === 'shopping' ? '#667eea' : 'white',
              }}
            >
              🛒 食材清單
            </button>
          </div>
        )}

        {/* Menu View */}
        {menu && view === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
            {menu.map((meal, index) => (
              <div key={index} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ background: '#667eea', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', marginRight: '12px' }}>
                      {meal.day}
                    </span>
                    <span style={{ fontSize: '14px', color: '#888', marginLeft: '8px' }}>{meal.category}</span>
                  </div>
                  <button onClick={() => regenerateDay(index)} style={{ background: '#f0f0f0', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                    🔄
                  </button>
                </div>
                <h3 style={{ fontSize: '24px', margin: '12px 0 8px' }}>{meal.name}</h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#666' }}>
                  <span>⏱️ {meal.time}</span>
                  <span>📊 {meal.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shopping List View */}
        {shoppingList && view === 'shopping' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🛒 食材清單</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shoppingList.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8f8f8', borderRadius: '8px' }}>
                  <span>{item.name}</span>
                  <span style={{ color: '#888' }}>x{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '60px', color: 'white', opacity: 0.7 }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </div>
      </div>
    </>
  );
}
