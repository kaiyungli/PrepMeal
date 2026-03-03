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

const difficultyOptions = ['易', '中', '難'];
const cuisineOptions = ['中式', '西式', '日式', '韓式', '港式'];

const emptyRecipe = {
  name: '',
  description: '',
  instructions: '',
  cooking_time: 15,
  difficulty: '易',
  cuisine: '中式',
  calories: 200,
  min_servings: 2,
  image_url: '',
  tags: []
};

export default function AdminPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [formData, setFormData] = useState(emptyRecipe);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadRecipes(); }, []);

  async function loadRecipes() {
    try {
      const res = await fetch('/api/admin/recipes');
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function handleEdit(recipe) {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name || '',
      description: recipe.description || '',
      instructions: recipe.instructions || '',
      cooking_time: recipe.cooking_time || 15,
      difficulty: recipe.difficulty || '易',
      cuisine: recipe.cuisine || '中式',
      calories: recipe.calories || 200,
      min_servings: recipe.min_servings || 2,
      image_url: recipe.image_url || '',
      tags: recipe.tags || []
    });
    setShowForm(true);
    setMessage('');
  }

  function handleNew() {
    setEditingRecipe(null);
    setFormData(emptyRecipe);
    setShowForm(true);
    setMessage('');
  }

  async function handleDelete(id) {
    if (!confirm('確定刪除呢個食譜？')) return;
    await fetch(`/api/admin/recipes?id=${id}`, { method: 'DELETE' });
    setMessage('需要API端點實現刪除功能');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    const url = editingRecipe 
      ? '/api/admin/recipes?id=' + editingRecipe.id 
      : '/api/admin/recipes';
    const method = editingRecipe ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (!res.ok) throw new Error('Failed to save');
    
    {
      setSaving(false);
      setShowForm(false);
      setMessage(editingRecipe ? '食譜已更新！' : '食譜已新增！');
      loadRecipes();
    }
  }

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleTagsChange(e) {
    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
    setFormData(prev => ({ ...prev, tags }));
  }

  return (
    <>
      <Head><title>今晚食乜 - 管理食譜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        <header style={{ background: colors.brown, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '24px' }}>🥘</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>今晚食乜</span>
          </Link>
          <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>返回首頁</Link>
        </header>

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown }}>管理食譜</h1>
            <button onClick={handleNew} style={{ padding: '12px 24px', background: colors.yellow, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>+ 新增食譜</button>
          </div>

          {message && <div style={{ padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '8px', marginBottom: '16px' }}>{message}</div>}

          {loading ? (
            <p>載入中...</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {recipes.map(recipe => (
                <div key={recipe.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown }}>{recipe.name}</h3>
                    <p style={{ fontSize: '13px', color: colors.textLight }}>{recipe.cooking_time}分鐘 · {recipe.cuisine} · {recipe.calories} kcal</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEdit(recipe)} style={{ padding: '8px 16px', background: colors.brown, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>編輯</button>
                    <button onClick={() => handleDelete(recipe.id)} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>刪除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: colors.brown, marginBottom: '20px' }}>
                {editingRecipe ? '編輯食譜' : '新增食譜'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>名稱 *</label>
                  <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>描述</label>
                  <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>做法 (每行一步)</label>
                  <textarea value={formData.instructions} onChange={(e) => handleChange('instructions', e.target.value)} rows={4} placeholder="1. 第一步&#10;2. 第二步..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>烹飪時間 (分鐘)</label>
                    <input type="number" value={formData.cooking_time} onChange={(e) => handleChange('cooking_time', parseInt(e.target.value))} min={1} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>卡路里</label>
                    <input type="number" value={formData.calories} onChange={(e) => handleChange('calories', parseInt(e.target.value))} min={0} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>難度</label>
                    <select value={formData.difficulty} onChange={(e) => handleChange('difficulty', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                      {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>菜式</label>
                    <select value={formData.cuisine} onChange={(e) => handleChange('cuisine', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                      {cuisineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>最少人數</label>
                    <input type="number" value={formData.min_servings} onChange={(e) => handleChange('min_servings', parseInt(e.target.value))} min={1} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>標籤 (逗號分隔)</label>
                    <input type="text" value={formData.tags.join(', ')} onChange={handleTagsChange} placeholder="送飯, 簡易" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>圖片網址</label>
                  <input type="url" value={formData.image_url} onChange={(e) => handleChange('image_url', e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: colors.yellow, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? '儲存中...' : '儲存'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '12px 24px', background: '#f0f0f0', color: colors.text, border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>取消</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
