'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Button, Input, Select, Modal } from '@/components';
import { Layout } from '@/components';

const difficultyOptions = [
  { value: '易' },
  { value: '中' },
  { value: '難' }
];

const cuisineOptions = [
  { value: '中式' },
  { value: '西式' },
  { value: '日式' },
  { value: '韓式' },
  { value: '港式' }
];

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
    try {
      await fetch(`/api/admin/recipes?id=${id}`, { method: 'DELETE' });
      setMessage('食譜已刪除！');
      loadRecipes();
    } catch (e) {
      setMessage('刪除失敗');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const url = editingRecipe
      ? '/api/admin/recipes?id=' + editingRecipe.id
      : '/api/admin/recipes';
    const method = editingRecipe ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save');

      setSaving(false);
      setShowForm(false);
      setMessage(editingRecipe ? '食譜已更新！' : '食譜已新增！');
      loadRecipes();
    } catch (e) {
      setSaving(false);
      setMessage('儲存失敗，請重試');
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
    <Layout showNav={false}>
      <Head><title>今晚食乜 - 管理食譜</title></Head>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#264653' }}>管理食譜</h1>
          <Button onClick={handleNew}>+ 新增食譜</Button>
        </div>

        {message && (
          <div style={{ padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '8px', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        {loading ? (
          <p>載入中...</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {recipes.map(recipe => (
              <div key={recipe.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#264653' }}>{recipe.name}</h3>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>{recipe.cooking_time}分鐘 · {recipe.cuisine} · {recipe.calories} kcal</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button size="sm" onClick={() => handleEdit(recipe)}>編輯</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(recipe.id)}>刪除</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showForm} title={editingRecipe ? '編輯食譜' : '新增食譜'} onClose={() => setShowForm(false)} maxWidth="600px">
        <form onSubmit={handleSubmit}>
          <Input label="名稱" value={formData.name} onChange={(v) => handleChange('name', v)} required placeholder="例如：番茄炒蛋" />
          <Input label="描述" value={formData.description} onChange={(v) => handleChange('description', v)} multiline rows={2} placeholder="簡短描述..." />
          <Input label="做法" value={formData.instructions} onChange={(v) => handleChange('instructions', v)} multiline rows={4} placeholder="1. 第一步&#10;2. 第二步..." />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="烹飪時間 (分鐘)" type="number" value={formData.cooking_time} onChange={(v) => handleChange('cooking_time', parseInt(v) || 0)} />
            <Input label="卡路里" type="number" value={formData.calories} onChange={(v) => handleChange('calories', parseInt(v) || 0)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select label="難度" options={difficultyOptions} value={formData.difficulty} onChange={(v) => handleChange('difficulty', v)} />
            <Select label="菜式" options={cuisineOptions} value={formData.cuisine} onChange={(v) => handleChange('cuisine', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="最少人數" type="number" value={formData.min_servings} onChange={(v) => handleChange('min_servings', parseInt(v) || 1)} />
            <Input label="標籤 (逗號分隔)" value={formData.tags.join(', ')} onChange={handleTagsChange} placeholder="送飯, 簡易" />
          </div>

          <Input label="圖片網址" value={formData.image_url} onChange={(v) => handleChange('image_url', v)} placeholder="https://..." />

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <Button type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? '儲存中...' : '儲存'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
