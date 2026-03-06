'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const colors = {
  background: '#F8F3E8',
  primary: '#9B6035',
  secondary: '#C8D49A',
  accent: '#F0A060',
  text: '#3A2010',
  textLight: '#AA7A50',
};

const cuisineOptions = ['全部', 'chinese', 'western', 'japanese', 'korean', 'thai', 'fusion'];
const dishTypeOptions = ['全部', 'main', 'side', 'soup', 'staple', 'snack'];
const difficultyOptions = ['全部', 'easy', 'medium', 'hard'];

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState([
    { id: '1', name: '蕃茄炒蛋', slug: 'tomato-egg', cuisine: 'chinese', dish_type: 'main', difficulty: 'easy', calories_per_serving: 180, is_public: true },
    { id: '2', name: '蒸水蛋', slug: 'steamed-egg', cuisine: 'chinese', dish_type: 'main', difficulty: 'easy', calories_per_serving: 120, is_public: true },
    { id: '3', name: '蝦仁炒蛋', slug: 'shrimp-egg', cuisine: 'chinese', dish_type: 'main', difficulty: 'easy', calories_per_serving: 200, is_public: true },
  ]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('全部');
  const [dishTypeFilter, setDishTypeFilter] = useState('全部');
  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/admin/recipes');
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (e) {
      console.error(e);
    }
    // setLoading(false); // removed
  };

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.slug?.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = cuisineFilter === '全部' || r.cuisine === cuisineFilter;
    const matchDishType = dishTypeFilter === '全部' || r.dish_type === dishTypeFilter;
    return matchSearch && matchCuisine && matchDishType;
  });

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除這個食譜嗎？')) return;
    try {
      const res = await fetch(`/api/admin/recipes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRecipes(recipes.filter(r => r.id !== id));
      }
    } catch (e) {
      alert('刪除失敗');
    }
  };

  const cuisineLabels = { chinese: '中式', western: '西式', japanese: '日式', korean: '韓式', thai: '泰式', fusion: 'Fusion' };
  const dishTypeLabels = { main: '主菜', side: '小食', soup: '湯', staple: '主食', snack: '小食' };
  const difficultyLabels = { easy: '易', medium: '中', hard: '難' };

  return (
    <>
      <Header />
      <Head><title>管理食譜 - 今晚食乜</title></Head>
      
      <div style={{ minHeight: '100vh', background: colors.background, padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: colors.text }}>食譜管理</h1>
            <button 
              onClick={() => { setEditRecipe(null); setShowForm(true); }}
              style={{ background: colors.primary, color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              + 新增食譜
            </button>
          </div>

          {/* Filters */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="搜尋食譜名稱..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1', minWidth: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            />
            <select
              value={cuisineFilter}
              onChange={e => setCuisineFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              {cuisineOptions.map(c => <option key={c} value={c}>{c === '全部' ? '全部菜系' : (cuisineLabels[c] || c)}</option>)}
            </select>
            <select
              value={dishTypeFilter}
              onChange={e => setDishTypeFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              {dishTypeOptions.map(d => <option key={d} value={d}>{d === '全部' ? '全部類型' : (dishTypeLabels[d] || d)}</option>)}
            </select>
          </div>

          {/* Recipe List */}
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>載入中...</p>
          ) : (
            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>圖片</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>名稱</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>菜系</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>類型</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>難度</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>卡路里</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>公開</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: colors.textLight }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipes.map(recipe => (
                    <tr key={recipe.id} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: recipe.image_url ? `url(${recipe.image_url}) center/cover` : '#eee', backgroundSize: 'cover' }} />
                      </td>
                      <td style={{ padding: '12px', fontWeight: '500', color: colors.text }}>{recipe.name}</td>
                      <td style={{ padding: '12px', color: colors.textLight }}>{cuisineLabels[recipe.cuisine] || '-'}</td>
                      <td style={{ padding: '12px', color: colors.textLight }}>{dishTypeLabels[recipe.dish_type] || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: recipe.difficulty === 'easy' ? colors.secondary : recipe.difficulty === 'medium' ? colors.accent : '#eee', fontSize: '12px' }}>
                          {difficultyLabels[recipe.difficulty] || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: colors.textLight }}>{recipe.calories_per_serving || '-'} 卡</td>
                      <td style={{ padding: '12px' }}>
                        {recipe.is_public ? '✅' : '❌'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={async () => { 
      setShowForm(true);
      // Fetch full recipe with ingredients and steps from API
      try {
        const res = await fetch('/api/admin/recipes?slug=' + recipe.slug);
        const data = await res.json();
        // Handle both { recipe } and { recipes: [] } formats
        const fullRecipe = data.recipe || (data.recipes && data.recipes[0]) || recipe;
        setEditRecipe(fullRecipe);
      } catch (e) {
        setEditRecipe(recipe);
      }
    }}
                          style={{ marginRight: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '12px' }}
                        >
                          編輯
                        </button>
                        <button 
                          onClick={() => handleDelete(recipe.id)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#fee', color: '#c00', cursor: 'pointer', fontSize: '12px' }}
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: colors.textLight }}>
                        沒有找到食譜
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <RecipeFormModal 
          recipe={editRecipe} 
          onClose={() => { setShowForm(false); setEditRecipe(null); }}
          onSave={() => { setShowForm(false); fetchRecipes(); }}
        />
      )}

      <Footer />
    </>
  );
}

function RecipeFormModal({ recipe, onClose, onSave }) {
  useEffect(() => {
    if (recipe && recipe.ingredients) {
      setIngredients(recipe.ingredients.map(i => ({ ingredient: i.ingredient_id || '', quantity: i.quantity || 1, unit: i.unit_id || 'g', is_optional: i.is_optional || false })));
    }
    if (recipe && recipe.steps) {
      console.log('Loading steps:', recipe.steps);
      setSteps(recipe.steps.map(s => ({ step_no: s.step_no, text: s.text, time_seconds: s.time_seconds || 0 })));
    } else {
      console.log('No steps in recipe, steps is:', recipe?.steps);
    }
  }, [recipe]);

  const [form, setForm] = useState({
    name: recipe?.name || '',
    slug: recipe?.slug || '',
    description: recipe?.description || '',
    cuisine: recipe?.cuisine || 'chinese',
    dish_type: recipe?.dish_type || 'main',
    method: recipe?.method || 'stir_fry',
    speed: recipe?.speed || 'quick',
    difficulty: recipe?.difficulty || 'easy',
    flavor: recipe?.flavor || [],
    is_public: recipe?.is_public ?? true,
    prep_time_minutes: recipe?.prep_time_minutes || 10,
    cook_time_minutes: recipe?.cook_time_minutes || 10,
    base_servings: recipe?.base_servings || 1,
    calories_per_serving: recipe?.calories_per_serving || '',
    protein_g: recipe?.protein_g || '',
    carbs_g: recipe?.carbs_g || '',
    fat_g: recipe?.fat_g || '',
    image_url: recipe?.image_url || '',
  });
  
  // Ingredients state
  const [ingredients, setIngredients] = useState(recipe?.ingredients || [{ ingredient: '', quantity: 1, unit: 'g', is_optional: false }]);
  
  // Steps state  
  const [steps, setSteps] = useState([]); // TODO: load from recipe
  
  const addIngredient = () => setIngredients([...ingredients, { ingredient: '', quantity: 1, unit: 'g', is_optional: false }]);
  const removeIngredient = (i) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[i][field] = value;
    setIngredients(newIngredients);
  };
  
  const addStep = () => setSteps([...steps, { step_no: steps.length + 1, text: '', time_seconds: 0 }]);
  const removeStep = (i) => setSteps(steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_no: idx + 1 })));
  const updateStep = (i, field, value) => {
    const newSteps = [...steps];
    newSteps[i][field] = value;
    setSteps(newSteps);
  };
  const [saving, setSaving] = useState(false);

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  const handleNameChange = (name) => {
    setForm({ ...form, name, slug: form.slug || generateSlug(name) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/recipes', {
        method: recipe?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ingredients, steps }),
      });
      if (res.ok) {
        onSave();
      } else {
        alert('儲存失敗');
      }
    } catch (e) {
      alert('儲存失敗');
    }
    setSaving(false);
  };

  const cuisineLabels = { chinese: '中式', western: '西式', japanese: '日式', korean: '韓式', thai: '泰式', fusion: 'Fusion' };
  const dishTypeLabels = { main: '主菜', side: '小食', soup: '湯', staple: '主食', snack: '小食' };
  const methodLabels = { stir_fry: '炒', steamed: '蒸', fried: '炸', braised: '炆', boiled: '煮', baked: '焗' };
  const speedLabels = { quick: '快', normal: '正常', slow: '慢' };
  const difficultyLabels = { easy: '易', medium: '中', hard: '難' };

  const ing_editor = (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '12px' }}>食材</h3>
      {ingredients.map((ing, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input type="text" value={ing.ingredient} onChange={e => updateIngredient(i, 'ingredient', e.target.value)} placeholder="食材" style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <input type="number" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', parseFloat(e.target.value) || 0)} placeholder="數量" style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="g">g</option><option value="ml">ml</option><option value="件">件</option><option value="隻">隻</option>
          </select>
          <button type="button" onClick={() => removeIngredient(i)} style={{ padding: '8px' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={addIngredient} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white' }}>+ 食材</button>
    </div>
  );

  const steps_editor = (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '12px' }}>步驟</h3>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <span style={{ padding: '8px', color: colors.textLight }}>{i+1}.</span>
          <textarea value={step.text} onChange={e => updateStep(i, 'text', e.target.value)} rows={2} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <input type="number" value={step.time_seconds || ''} onChange={e => updateStep(i, 'time_seconds', parseInt(e.target.value) || 0)} placeholder="秒" style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <button type="button" onClick={() => removeStep(i)} style={{ padding: '8px' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={addStep} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white' }}>+ 步驟</button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text }}>
            {recipe ? '編輯食譜' : '新增食譜'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Basic Info */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '12px' }}>基本資料</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>食譜名稱 *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm({...form, slug: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>描述</label>
              <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>菜系</label>
                <select
                  value={form.cuisine}
                  onChange={e => setForm({...form, cuisine: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {Object.entries(cuisineLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>類型</label>
                <select
                  value={form.dish_type}
                  onChange={e => setForm({...form, dish_type: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {Object.entries(dishTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>煮法</label>
                <select
                  value={form.method}
                  onChange={e => setForm({...form, method: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {Object.entries(methodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>速度</label>
                <select
                  value={form.speed}
                  onChange={e => setForm({...form, speed: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {Object.entries(speedLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>難度</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm({...form, difficulty: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {Object.entries(difficultyLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Time & Nutrition */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '12px' }}>時間同營養</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>準備時間 (分鐘)</label>
                <input
                  type="number"
                  value={form.prep_time_minutes}
                  onChange={e => setForm({...form, prep_time_minutes: parseInt(e.target.value) || 0})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>烹飪時間 (分鐘)</label>
                <input
                  type="number"
                  value={form.cook_time_minutes}
                  onChange={e => setForm({...form, cook_time_minutes: parseInt(e.target.value) || 0})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: colors.textLight, marginBottom: '12px' }}>總時間: {form.prep_time_minutes + form.cook_time_minutes} 分鐘</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>份量</label>
                <input
                  type="number"
                  value={form.base_servings}
                  onChange={e => setForm({...form, base_servings: parseInt(e.target.value) || 1})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>卡路里</label>
                <input
                  type="number"
                  value={form.calories_per_serving}
                  onChange={e => setForm({...form, calories_per_serving: parseInt(e.target.value) || null})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>蛋白質 (g)</label>
                <input
                  type="number"
                  value={form.protein_g}
                  onChange={e => setForm({...form, protein_g: parseInt(e.target.value) || null})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>脂肪 (g)</label>
                <input
                  type="number"
                  value={form.fat_g}
                  onChange={e => setForm({...form, fat_g: parseInt(e.target.value) || null})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          {/* Image URL */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: colors.textLight, marginBottom: '4px' }}>圖片網址</label>
            <input
              type="url"
              value={form.image_url}
              onChange={e => setForm({...form, image_url: e.target.value})}
              placeholder="https://..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            />
            {form.image_url && (
              <div style={{ marginTop: '8px', width: '100px', height: '100px', borderRadius: '8px', background: `url(${form.image_url}) center/cover`, backgroundSize: 'cover' }} />
            )}
          </div>
          
          {ing_editor}
          
          {steps_editor}
          
          {/* Public Toggle */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="is_public"
              checked={form.is_public}
              onChange={e => setForm({...form, is_public: e.target.checked})}
            />
            <label htmlFor="is_public" style={{ fontSize: '14px', color: colors.text }}>公開顯示</label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: colors.primary, color: 'white', fontSize: '16px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '儲存中...' : '儲存食譜'}
          </button>
        </form>
      </div>
    </div>
  );
}
