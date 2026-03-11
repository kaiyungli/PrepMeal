'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const colors = {
  brown: '#264653',
  cream: '#F8F3E8',
  primary: '#9B6035',
  secondary: '#C8D49A',
  accent: '#F0A060',
};

const cuisineOptions = ['chinese', 'western', 'japanese', 'korean', 'thai', 'taiwanese', 'indian', 'italian', 'fusion'];
const dishTypeOptions = ['main', 'side', 'soup', 'staple', 'snack', 'dessert'];
const difficultyOptions = ['easy', 'medium', 'hard'];

function RecipeForm({ recipe, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    cuisine: 'chinese',
    dish_type: 'main',
    difficulty: 'easy',
    prep_time: 15,
    cook_time: 20,
    servings: 2,
    image_url: '',
    calories_per_serving: '',
    is_public: true,
    ingredients: [],
    steps: [],
    tags: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (recipe) {
      setForm({
        ...recipe,
        ingredients: recipe.ingredients?.map(i => ({ name: i.name || i.ingredient_name || '', quantity: i.quantity || '', unit: i.unit || '', notes: i.notes || '' })) || [],
        steps: recipe.steps?.map(s => ({ text: s.text || s.instruction || '' })) || [],
        tags: recipe.tags?.join(', ') || '',
      });
    }
  }, [recipe]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addIngredient = () => {
    setForm(prev => ({ ...prev, ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '', notes: '' }] }));
  };

  const removeIngredient = (index) => {
    setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
  };

  const updateIngredient = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing)
    }));
  };

  const addStep = () => {
    setForm(prev => ({ ...prev, steps: [...prev.steps, { text: '' }] }));
  };

  const removeStep = (index) => {
    setForm(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  };

  const updateStep = (index, value) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { text: value } : s)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!form.name?.trim()) return setError('請輸入食譜名稱');
    if (!form.slug?.trim()) return setError('請輸入網址 slug');
    if (form.ingredients.length === 0) return setError('請至少添加一個食材');
    if (form.steps.length === 0) return setError('請至少添加一個步驟');

    setSaving(true);
    
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        ingredients: form.ingredients.filter(i => i.name?.trim()),
        steps: form.steps.filter(s => s.text?.trim()),
      };
      
      const url = recipe?.id ? `/api/admin/recipes?id=${recipe.id}` : '/api/admin/recipes';
      const method = recipe?.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || '儲存失敗');
      }
    } catch (err) {
      setError('發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
      
      {/* Basic Info */}
      <div>
        <h3 className="text-lg font-bold text-[#3A2010] mb-4">📝 基本資料</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">食譜名稱 *</label>
            <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="例如：番茄炒蛋" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">Slug *</label>
            <input value={form.slug} onChange={e => handleChange('slug', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="tomato-scrambled-eggs" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">描述</label>
            <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="簡短描述這道菜..." />
          </div>
        </div>
      </div>

      {/* Category & Difficulty */}
      <div>
        <h3 className="text-lg font-bold text-[#3A2010] mb-4">🏷️ 分類</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">菜系</label>
            <select value={form.cuisine} onChange={e => handleChange('cuisine', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
              {cuisineOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">類型</label>
            <select value={form.dish_type} onChange={e => handleChange('dish_type', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
              {dishTypeOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">難度</label>
            <select value={form.difficulty} onChange={e => handleChange('difficulty', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
              {difficultyOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">公開</label>
            <select value={form.is_public ? 'true' : 'false'} onChange={e => handleChange('is_public', e.target.value === 'true')} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timing & Servings */}
      <div>
        <h3 className="text-lg font-bold text-[#3A2010] mb-4">⏱️ 時間與份量</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">準備時間 (分鐘)</label>
            <input type="number" value={form.prep_time} onChange={e => handleChange('prep_time', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">烹飪時間 (分鐘)</label>
            <input type="number" value={form.cook_time} onChange={e => handleChange('cook_time', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">份量</label>
            <input type="number" value={form.servings} onChange={e => handleChange('servings', parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">熱量/份</label>
            <input type="number" value={form.calories_per_serving || ''} onChange={e => handleChange('calories_per_serving', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="可選" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">標籤</label>
            <input value={form.tags} onChange={e => handleChange('tags', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="quick, healthy" />
          </div>
        </div>
      </div>

      {/* Image URL */}
      <div>
        <h3 className="text-lg font-bold text-[#3A2010] mb-4">🖼️ 圖片</h3>
        <input value={form.image_url || ''} onChange={e => handleChange('image_url', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="https://..." />
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-[#3A2010]">🥬 食材 ({form.ingredients.length})</h3>
          <button type="button" onClick={addIngredient} className="text-sm bg-[#C8D49A] text-[#3A2010] px-3 py-1 rounded-lg hover:bg-[#b5c288]">+ 添加食材</button>
        </div>
        <div className="space-y-2">
          {form.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-[#AA7A50] text-sm w-6">{i + 1}.</span>
              <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="食材名稱" className="flex-1 px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" />
              <input value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} placeholder="份量" className="w-20 px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" />
              <input value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} placeholder="單位" className="w-20 px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" />
              <button type="button" onClick={() => removeIngredient(i)} className="text-red-500 hover:text-red-700">✕</button>
            </div>
          ))}
          {form.ingredients.length === 0 && <p className="text-[#AA7A50] text-sm italic">點擊「添加食材」開始</p>}
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-[#3A2010]">👩‍🍳 步驟 ({form.steps.length})</h3>
          <button type="button" onClick={addStep} className="text-sm bg-[#C8D49A] text-[#3A2010] px-3 py-1 rounded-lg hover:bg-[#b5c288]">+ 添加步驟</button>
        </div>
        <div className="space-y-3">
          {form.steps.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#AA7A50] text-sm font-bold w-8 pt-2">Step {i + 1}</span>
              <textarea value={step.text} onChange={e => updateStep(i, e.target.value)} rows={2} className="flex-1 px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" placeholder={`步驟 ${i + 1} 的說明...`} />
              <button type="button" onClick={() => removeStep(i)} className="text-red-500 hover:text-red-700 pt-2">✕</button>
            </div>
          ))}
          {form.steps.length === 0 && <p className="text-[#AA7A50] text-sm italic">點擊「添加步驟」開始</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#DDD0B0]">
        <button type="submit" disabled={saving} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg font-medium hover:bg-[#7a4a2a] disabled:opacity-50">
          {saving ? '儲存中...' : (recipe ? '更新食譜' : '新增食譜')}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 border border-[#DDD0B0] text-[#3A2010] rounded-lg hover:bg-[#F8F3E8]">
          取消
        </button>
      </div>
    </form>
  );
}

export default function AdminRecipes() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | form
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [dishTypeFilter, setDishTypeFilter] = useState('all');
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    fetch('/api/admin/check')
      .then(res => res.ok ? setIsAdmin(true) : router.push('/admin/login'))
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/admin/recipes')
        .then(res => res.json())
        .then(data => setRecipes(data.recipes || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = !searchTerm || r.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuisine = cuisineFilter === 'all' || r.cuisine === cuisineFilter;
    const matchesDishType = dishTypeFilter === 'all' || r.dish_type === dishTypeFilter;
    return matchesSearch && matchesCuisine && matchesDishType;
  });

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleSave = () => {
    // Refresh list
    fetch('/api/admin/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data.recipes || []));
    setView('list');
    setEditingRecipe(null);
  };

  if (loading) return <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center"><span className="text-[#9B6035]">載入中...</span></div>;
  if (!isAdmin) return null;

  return (
    <>
      <Header />
      <Head><title>食譜管理 - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] pb-20">
        <div className="bg-[#9B6035] px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-white text-xl font-bold">🍳 食譜管理</h1>
            <button onClick={handleLogout} className="text-white/80 hover:text-white text-sm">登出</button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {view === 'form' ? (
            <div>
              <button onClick={() => { setView('list'); setEditingRecipe(null); }} className="mb-4 text-[#9B6035] hover:underline">← 返回列表</button>
              <RecipeForm 
                recipe={editingRecipe} 
                onSave={handleSave} 
                onCancel={() => { setView('list'); setEditingRecipe(null); }} 
              />
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                  <input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="搜尋食譜..." 
                    className="flex-1 min-w-[200px] px-4 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" 
                  />
                  <select value={cuisineFilter} onChange={e => setCuisineFilter(e.target.value)} className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
                    <option value="all">全部菜系</option>
                    {cuisineOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={dishTypeFilter} onChange={e => setDishTypeFilter(e.target.value)} className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
                    <option value="all">全部類型</option>
                    {dishTypeOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button 
                    onClick={() => { setEditingRecipe(null); setView('form'); }}
                    className="bg-[#9B6035] text-white px-5 py-2 rounded-lg hover:bg-[#7a4a2a]"
                  >
                    + 新增食譜
                  </button>
                </div>
                <p className="text-[#AA7A50] text-sm mt-2">{filteredRecipes.length} 個食譜</p>
              </div>

              {/* Recipe Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredRecipes.map(recipe => (
                  <div key={recipe.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <div 
                      className="h-32 bg-cover bg-center" 
                      style={{ backgroundImage: recipe.image_url ? `url(${recipe.image_url})` : 'linear-gradient(#ddd, #ccc)' }} 
                    />
                    <div className="p-3">
                      <h3 className="font-semibold text-[#3A2010] truncate">{recipe.name}</h3>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {recipe.cuisine && <span className="text-xs bg-[#C8D49A] text-[#3A2010] px-2 py-0.5 rounded">{recipe.cuisine}</span>}
                        {recipe.difficulty && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{recipe.difficulty}</span>}
                      </div>
                      <button 
                        onClick={() => { setEditingRecipe(recipe); setView('form'); }}
                        className="w-full mt-3 bg-[#F0A060] text-white py-1.5 rounded text-sm hover:bg-[#d88a4a]"
                      >
                        編輯
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
