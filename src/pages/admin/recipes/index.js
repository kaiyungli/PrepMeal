'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const cuisineOptions = ['chinese', 'western', 'japanese', 'korean', 'thai', 'taiwanese', 'indian', 'italian', 'fusion'];
const dishTypeOptions = ['main', 'side', 'soup', 'staple', 'snack', 'dessert'];
const difficultyOptions = ['easy', 'medium', 'hard'];
const presetTags = ['家常', '快手', '高蛋白', '低卡', '湯類', '蒸', '煎', '炒', '焗', '小朋友啱食', '一鍋到底', '下飯', '健康', '早餐', '晚餐'];

// Ingredient Selector Component
function IngredientSelector({ value, onChange, ingredients }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedIngredient = ingredients.find(i => i.id === value);
  
  // Show search if user is typing, otherwise show selected or placeholder
  const displayValue = isOpen ? search : (selectedIngredient?.name || '');
  
  const filtered = search 
    ? ingredients.filter(i => 
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.slug.toLowerCase().includes(search.toLowerCase())
      )
    : ingredients.slice(0, 10);
  
  const handleSelect = (ing) => {
    onChange(ing.id);
    setSearch(ing.name);
    setIsOpen(false);
  };
  
  const handleClear = () => {
    onChange(null);
    setSearch('');
    setIsOpen(true);
  };
  
  return (
    <div className="relative flex-1">
      <div className="flex">
        <input
          type="text"
          value={displayValue}
          onChange={e => {
            setSearch(e.target.value);
            onChange(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedIngredient ? '' : '搜尋食材...'}
          className="flex-1 px-3 py-2 border border-[#DDD0B0] rounded-l-lg text-[#3A2010] text-sm"
        />
        {selectedIngredient && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 bg-[#F0E8D8] border border-l-0 border-[#DDD0B0] rounded-r-lg text-[#AA7A50] hover:bg-[#E8DCC8]"
            title="清除選擇"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 bg-[#C8D49A] border border-l-0 border-[#DDD0B0] rounded-r-lg text-[#3A2010]"
        >
          ▼
        </button>
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-[#DDD0B0] rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map(ing => (
            <button
              key={ing.id}
              type="button"
              onClick={() => handleSelect(ing)}
              className="w-full text-left px-3 py-2 hover:bg-[#F8F3E8] text-sm flex justify-between items-center"
            >
              <span>{ing.name}</span>
              {ing.shopping_category && <span className="text-xs text-[#AA7A50]">({ing.shopping_category})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Unit Selector Component
function UnitSelector({ value, onChange, units }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedUnit = units.find(u => u.id === value);
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm text-left flex justify-between items-center"
      >
        {selectedUnit?.name || '單位'}
        <span className="text-xs">▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-32 mt-1 bg-white border border-[#DDD0B0] rounded-lg shadow-lg max-h-48 overflow-auto">
          {units.map(unit => (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                onChange(unit.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#F8F3E8] text-sm"
            >
              {unit.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeForm({ recipe, existingRecipes = [], onSave, onCancel }) {
  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [form, setForm] = useState({
    name: '', slug: '', description: '', cuisine: 'chinese', dish_type: 'main', difficulty: 'easy',
    prep_time: 15, cook_time: 20, servings: 2, image_url: '', calories_per_serving: '', is_public: true,
    ingredients: [], steps: [], tags: [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [similarNames, setSimilarNames] = useState([]);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      fetch('/api/admin/ingredients').then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch ingredients');
        return res.json();
      }),
      fetch('/api/admin/units').then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch units');
        return res.json();
      })
    ]).then(([ingData, unitData]) => {
      setIngredients(ingData.ingredients || []);
      setUnits(unitData.units || []);
    }).catch((err) => {
      console.error('Failed to load data:', err);
      setError('載入資料失敗，請刷新頁面');
    }).finally(() => {
      setLoadingData(false);
    });
  }, []);

  useEffect(() => {
    if (form.name && existingRecipes.length > 0) {
      const similar = existingRecipes.filter(r => r.name && r.id !== recipe?.id && (r.name.includes(form.name) || form.name.includes(r.name))).map(r => r.name);
      setSimilarNames(similar);
    } else {
      setSimilarNames([]);
    }
  }, [form.name, existingRecipes, recipe]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return setError('只支援 JPG, PNG, WebP 格式');
    if (file.size > 5 * 1024 * 1024) return setError('圖片大小不能超過 5MB');
    setUploading(true);
    setError('');
    try {
      const slug = form.slug || 'recipe';
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `recipes/${slug}-${Date.now()}.${ext}`;
      const res = await fetch('/api/admin/uploads/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType: file.type }),
      });
      const { uploadUrl, publicUrl } = await res.json();
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      handleChange('image_url', publicUrl);
    } catch (err) { setError('圖片上傳失敗'); } 
    finally { setUploading(false); }
  };

  useEffect(() => {
    if (recipe) {
      const formIngredients = (recipe.ingredients || []).map(i => ({
        ingredient_id: i.ingredient_id || i.ingredients?.id || null,
        quantity: i.quantity || '',
        unit_id: i.unit_id || null,
        is_optional: i.is_optional || false,
        notes: i.notes || i.prep_note || '',
        group_key: i.group_key || ''
      }));
      const formSteps = (recipe.steps || []).map(s => ({ text: s.text || s.instruction || '', time_seconds: s.time_seconds || '' }));
      
      // Map DB column names to form field names
      // DB: prep_time_minutes, cook_time_minutes, base_servings -> Form: prep_time, cook_time, servings
      // Safely parse tags from recipe data
      let recipeTags = [];
      if (recipe.tags) {
        if (Array.isArray(recipe.tags)) {
          recipeTags = recipe.tags;
        } else if (typeof recipe.tags === 'string') {
          try {
            recipeTags = JSON.parse(recipe.tags);
          } catch {
            recipeTags = recipe.tags.split(',').map(t => t.trim()).filter(Boolean);
          }
        }
      }
      
      const formData = {
        ...recipe,
        prep_time: recipe.prep_time_minutes || recipe.prep_time || 15,
        cook_time: recipe.cook_time_minutes || recipe.cook_time || 20,
        servings: recipe.base_servings || recipe.servings || 2,
        ingredients: formIngredients,
        steps: formSteps,
        tags: recipeTags
      };
      setForm(formData);
    }
  }, [recipe]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleTag = (tag) => setForm(prev => ({ ...prev, tags: (prev.tags || []).includes(tag) ? prev.tags.filter(t => t !== tag) : [...(prev.tags || []), tag] }));
  const addCustomTag = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { if (!(form.tags || []).includes(e.target.value.trim())) setForm(prev => ({ ...prev, tags: [...(prev.tags || []), e.target.value.trim()] })); e.target.value = ''; }};

  const addIngredient = () => setForm(prev => ({ ...prev, ingredients: [...prev.ingredients, { ingredient_id: null, quantity: '', unit_id: null, is_optional: false, notes: '', group_key: '' }] }));
  const removeIngredient = (index) => setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
  const updateIngredient = (index, field, value) => setForm(prev => ({ ...prev, ingredients: prev.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing) }));

  const addStep = () => setForm(prev => ({ ...prev, steps: [...prev.steps, { text: '', time_seconds: '' }] }));
  const removeStep = (index) => setForm(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  const updateStep = (index, field, value) => setForm(prev => ({ ...prev, steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s) }));
  const moveStep = (index, direction) => { const newSteps = [...form.steps]; if (direction === 'up' && index > 0) [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]]; else if (direction === 'down' && index < newSteps.length - 1) [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]; setForm(prev => ({ ...prev, steps: newSteps })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name?.trim()) return setError('請輸入食譜名稱');
    if (!form.slug?.trim()) return setError('請輸入網址 slug');
    // Validate quantity is a positive number
    const invalidQuantity = form.ingredients.find(i => i.ingredient_id && i.unit_id && (!i.quantity || isNaN(parseFloat(i.quantity)) || parseFloat(i.quantity) <= 0));
    if (invalidQuantity) return setError('請輸入有效的份量 (必須大於 0)');
    
    const validIngredients = form.ingredients.filter(i => i.ingredient_id && i.quantity && i.unit_id);
    if (validIngredients.length === 0) return setError('請至少添加一個有效食材 (需要選擇食材、份量和單位)');
    if (form.steps.length === 0) return setError('請至少添加一個步驟');
    const validSteps = form.steps.filter(s => s.text?.trim());
    if (validSteps.length === 0) return setError('請至少添加一個有效步驟');
    const existingSlug = existingRecipes.find(r => r.slug === form.slug && r.id !== recipe?.id);
    if (existingSlug) return setError(`Slug "${form.slug}" 已被食譜「${existingSlug.name}」使用`);
    setSaving(true);
    try {
      const payload = {
        ...form, 
        tags: Array.isArray(form.tags) ? form.tags : [],
        ingredients: form.ingredients.filter(i => i.ingredient_id && i.quantity).map(i => ({ ingredient_id: i.ingredient_id, quantity: parseFloat(i.quantity) || 0, unit_id: i.unit_id, is_optional: i.is_optional || false, notes: i.notes || '', group_key: i.group_key || null })),
        steps: form.steps.filter(s => s.text?.trim()).map((s, idx) => ({ step_no: idx + 1, text: s.text.trim(), time_seconds: s.time_seconds ? parseInt(s.time_seconds) : null }))
      };
      const url = recipe?.id ? `/api/admin/recipes?id=${recipe.id}` : '/api/admin/recipes';
      const method = recipe?.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save recipe');
      onSave(data.recipe);
    } catch (err) { setError(err.message); } 
    finally { setSaving(false); }
  };

  if (loadingData) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-[#AA7A50]">載入中...</div></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {similarNames.length > 0 && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">警告: 食譜名稱與現有食譜相似: {similarNames.join(', ')}</div>}

      <div>
        <h3 className="text-lg font-bold text-[#3A2010] mb-4">📝 基本資料</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">食譜名稱 *</label>
            <input value={form.name} onChange={e => { handleChange('name', e.target.value); if (!form.slug) handleChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '')); }} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="例如: 番茄炒蛋" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">Slug *</label>
            <input value={form.slug} onChange={e => handleChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, ''))} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="fan_qie_chao_dan" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">描述</label>
            <textarea value={form.description || ''} onChange={e => handleChange('description', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="食譜簡介..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1"> cuisine</label>
            <select value={form.cuisine} onChange={e => handleChange('cuisine', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{cuisineOptions.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">菜式類型</label>
            <select value={form.dish_type} onChange={e => handleChange('dish_type', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{dishTypeOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">難度</label>
            <select value={form.difficulty} onChange={e => handleChange('difficulty', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{difficultyOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">公開</label>
            <select value={form.is_public ? 'true' : 'false'} onChange={e => handleChange('is_public', e.target.value === 'true')} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]"><option value="true">是</option><option value="false">否</option></select>
          </div>
        </div>
      </div>

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
            <div className="flex flex-wrap gap-1 mb-2">{(form.tags || []).map(tag => (<span key={tag} className="inline-flex items-center gap-1 bg-[#9B6035] text-white text-xs px-2 py-1 rounded-full">{tag}<button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-200">×</button></span>))}</div>
            <div className="flex flex-wrap gap-1 mb-2">{presetTags.filter(t => !(form.tags || []).includes(t)).map(tag => (<button key={tag} type="button" onClick={() => toggleTag(tag)} className="text-xs px-2 py-1 rounded-full border border-[#DDD0B0] text-[#AA7A50] hover:bg-[#F8F3E8]">+ {tag}</button>))}</div>
            <input onKeyDown={addCustomTag} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" placeholder="輸入自訂標籤，按 Enter 加入" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#3A2010] mb-4">🖼️ 圖片</h3>
        <div className="flex gap-3 items-start">
          <div className="flex-1"><input value={form.image_url || ''} onChange={e => handleChange('image_url', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="圖片網址或上傳" /></div>
          <label className="cursor-pointer bg-[#C8D49A] text-[#3A2010] px-4 py-2 rounded-lg hover:bg-[#b5c288]">{uploading ? '上傳中...' : '📁 上傳'}<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} /></label>
        </div>
        {form.image_url && <div className="mt-2"><img src={form.image_url} alt="預覽" className="h-32 object-cover rounded-lg" /></div>}
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-[#3A2010]">🥬 食材 ({form.ingredients.length})</h3>
          <button type="button" onClick={addIngredient} className="text-sm bg-[#C8D49A] text-[#3A2010] px-3 py-1 rounded-lg hover:bg-[#b5c288]">+ 添加食材</button>
        </div>
        <div className="hidden md:grid grid-cols-13 gap-2 text-xs text-[#AA7A50] font-medium px-2 mb-2">
          <div className="col-span-4">食材</div><div className="col-span-2">份量</div><div className="col-span-2">單位</div><div className="col-span-2">備註</div><div className="col-span-2">分組</div><div className="col-span-1"></div>
        </div>
        <div className="space-y-2">
          {form.ingredients.map((ing, i) => {
            const selectedIng = ingredients.find(a => a.id === ing.ingredient_id);
            return (
              <div key={i} className="grid grid-cols-1 md:grid-cols-13 gap-2 items-center bg-[#FDFBF7] p-2 rounded-lg">
                <div className="col-span-4"><IngredientSelector value={ing.ingredient_id} onChange={v => updateIngredient(i, 'ingredient_id', v)} ingredients={ingredients} />{selectedIng && <span className="text-xs text-[#AA7A50] ml-2">{selectedIng.shopping_category}</span>}</div>
                <div className="col-span-2"><input type="number" step="0.1" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} placeholder="份量" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" /></div>
                <div className="col-span-2"><UnitSelector value={ing.unit_id} onChange={v => updateIngredient(i, 'unit_id', v)} units={units} /></div>
                <div className="col-span-2"><input value={ing.notes} onChange={e => updateIngredient(i, 'notes', e.target.value)} placeholder="備註" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" /></div>
                <div className="col-span-2"><input value={ing.group_key || ''} onChange={e => updateIngredient(i, 'group_key', e.target.value)} placeholder="分組" className="w-full px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" /></div>
                <div className="col-span-1 flex items-center gap-2"><label className="flex items-center gap-1 text-xs text-[#AA7A50]"><input type="checkbox" checked={ing.is_optional} onChange={e => updateIngredient(i, 'is_optional', e.target.checked)} className="rounded" />可選</label><button type="button" onClick={() => removeIngredient(i)} className="text-red-500 hover:text-red-700">✕</button></div>
              </div>
            );
          })}
          {form.ingredients.length === 0 && <p className="text-[#AA7A50] text-sm italic">點擊「添加食材」開始</p>}
        </div>
        <p className="text-xs text-[#AA7A50] mt-2">每個食材需要: 食材名稱 + 份量 + 單位 (可選食材請勾選)</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-[#3A2010]">👩‍🍳 步驟 ({form.steps.length})</h3>
          <button type="button" onClick={addStep} className="text-sm bg-[#C8D49A] text-[#3A2010] px-3 py-1 rounded-lg hover:bg-[#b5c288]">+ 添加步驟</button>
        </div>
        <div className="space-y-3">
          {form.steps.map((step, i) => (
            <div key={i} className="flex gap-2 items-start bg-[#FDFBF7] p-2 rounded-lg">
              <span className="text-[#AA7A50] text-sm font-bold w-8 pt-2">Step {i + 1}</span>
              <textarea value={step.text} onChange={e => updateStep(i, 'text', e.target.value)} rows={2} className="flex-1 px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" placeholder={`步驟 ${i + 1} 的說明...`} />
              <input type="number" value={step.time_seconds || ''} onChange={e => updateStep(i, 'time_seconds', e.target.value)} placeholder="秒" className="w-20 px-2 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] text-sm" title="時間 (秒)" />
              <div className="flex flex-col"><button type="button" onClick={() => moveStep(i, 'up')} disabled={i === 0} className="text-[#AA7A50] hover:text-[#9B6035] disabled:opacity-30">↑</button><button type="button" onClick={() => moveStep(i, 'down')} disabled={i === form.steps.length - 1} className="text-[#AA7A50] hover:text-[#9B6035] disabled:opacity-30">↓</button></div>
              <button type="button" onClick={() => removeStep(i)} className="text-red-500 hover:text-red-700 pt-2">✕</button>
            </div>
          ))}
          {form.steps.length === 0 && <p className="text-[#AA7A50] text-sm italic">點擊「添加步驟」開始</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-[#DDD0B0]">
        <button type="submit" disabled={saving} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg font-medium hover:bg-[#7a4a2a] disabled:opacity-50">{saving ? '儲存中...' : (recipe ? '更新食譜' : '新增食譜')}</button>
        <button type="button" onClick={onCancel} className="px-6 py-3 border border-[#DDD0B0] text-[#3A2010] rounded-lg hover:bg-[#F8F3E8]">取消</button>
      </div>
    </form>
  );
}

export default function AdminRecipes() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [showImportModal, setShowImportModal] = useState(false);
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
        .then(res => {
          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('[ADMIN RECIPES] Raw response:', data);
          console.log('[ADMIN RECIPES] Loaded:', data.recipes?.length || 0, 'recipes');
          setRecipes(data.recipes || []);
        })
        .catch(err => {
          console.error('[ADMIN RECIPES] Error:', err);
          setRecipes([]);
        });
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
    fetch('/api/admin/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data.recipes || []));
    setView('list');
    setEditingRecipe(null);
  };

  const [deletingRecipe, setDeletingRecipe] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (recipe) => {
    setDeletingRecipe(recipe);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecipe) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/recipes?id=${deletingRecipe.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '刪除失敗');
      }
      setRecipes(recipes.filter(r => r.id !== deletingRecipe.id));
      setDeletingRecipe(null);
      alert('食譜已刪除');
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingRecipe(null);
  };

  if (loading) return <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center"><span className="text-[#9B6035]">載入中...</span></div>;
  if (!isAdmin) return null;

  return (
    <>
      <Header />
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
              <RecipeForm recipe={editingRecipe} existingRecipes={recipes} onSave={handleSave} onCancel={() => { setView('list'); setEditingRecipe(null); }} />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋食譜..." className="flex-1 min-w-[200px] px-4 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" />
                  <select value={cuisineFilter} onChange={e => setCuisineFilter(e.target.value)} className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
                    <option value="all">全部菜系</option>
                    {cuisineOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={dishTypeFilter} onChange={e => setDishTypeFilter(e.target.value)} className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
                    <option value="all">全部類型</option>
                    {dishTypeOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={() => { setEditingRecipe(null); setView('form'); }} className="bg-[#9B6035] text-white px-5 py-2 rounded-lg hover:bg-[#7a4a2a]">+ 新增食譜</button>
                  <button onClick={() => setShowImportModal(true)} className="bg-[#C8D49A] text-[#3A2010] px-5 py-2 rounded-lg hover:bg-[#b5c288]">📥 匯入</button>
                </div>
                <p className="text-[#AA7A50] text-sm mt-2">{filteredRecipes.length} 個食譜</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredRecipes.map(recipe => (
                  <div key={recipe.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <div className="h-32 bg-cover bg-center" style={{ backgroundImage: recipe.image_url ? `url(${recipe.image_url})` : 'linear-gradient(#ddd, #ccc)' }} />
                    <div className="p-3">
                      <h3 className="font-semibold text-[#3A2010] truncate">{recipe.name}</h3>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {recipe.cuisine && <span className="text-xs bg-[#C8D49A] text-[#3A2010] px-2 py-0.5 rounded">{recipe.cuisine}</span>}
                        {recipe.difficulty && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{recipe.difficulty}</span>}
                      </div>
                      <button onClick={() => { setEditingRecipe(recipe); setView('form'); }} className="w-full mt-3 bg-[#F0A060] text-white py-1.5 rounded text-sm hover:bg-[#d88a4a]">編輯</button>
                      <button onClick={() => { const cloned = { ...recipe, id: undefined, name: recipe.name + '（副本）', slug: recipe.slug + '-copy' }; setEditingRecipe(cloned); setView('form'); }} className="w-full mt-2 bg-[#C8D49A] text-[#3A2010] py-1.5 rounded text-sm hover:bg-[#b5c288]">複製</button>
                      <button onClick={() => handleDeleteClick(recipe)} className="w-full mt-2 bg-red-500 text-white py-1.5 rounded text-sm hover:bg-red-600">刪除</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onSuccess={handleSave} />}
        
        {/* Delete Confirmation Modal */}
        {deletingRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-[#3A2010] mb-4">⚠️ 確認刪除</h2>
              <p className="text-[#3A2010] mb-4">
                確定要刪除「<strong>{deletingRecipe.name}</strong>」？
              </p>
              <p className="text-red-600 text-sm mb-6">
                此操作會同時刪除相關食材、步驟等資料，且不能還原。
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleDeleteConfirm} 
                  disabled={deleting}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? '刪除中...' : '確認刪除'}
                </button>
                <button 
                  onClick={handleDeleteCancel} 
                  disabled={deleting}
                  className="flex-1 px-6 py-3 border border-[#DDD0B0] text-[#3A2010] rounded-lg hover:bg-[#F8F3E8] disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ImportModal({ onClose, onSuccess }) {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handlePreview = () => {
    setError('');
    let parsed;
    try { parsed = JSON.parse(jsonInput); } catch (e) { setError('Invalid JSON format'); return; }
    const recipes = Array.isArray(parsed) ? parsed : [parsed];
    if (recipes.length === 0) { setError('No recipes to import'); return; }
    setResults({ preview: true, total: recipes.length, recipes });
  };

  const handleImport = async () => {
    if (!results?.recipes) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/recipes/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipes: results.recipes }) });
      const data = await res.json();
      setResults(data);
      if (data.success > 0) onSuccess();
    } catch (err) { setError('Import failed'); } 
    finally { setLoading(false); }
  };

  const sampleJson = `[
  { "name": "蒜蓉西蘭花", "slug": "garlic-broccoli", "cuisine": "chinese", "dish_type": "side", "difficulty": "easy", "ingredients": [{ "name": "西蘭花", "quantity": 1, "unit": "棵" }], "steps": [{ "text": "焯水備用" }] }
]`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#3A2010]">📥 批量匯入食譜</h2>
            <button onClick={onClose} className="text-[#AA7A50] hover:text-[#9B6035]">✕</button>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>}
          {results ? (
            <div className="space-y-4">
              {results.preview ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg"><p className="font-medium text-blue-800">發現 {results.total} 個食譜，確認匯入？</p></div>
                  <div className="flex gap-2">
                    <button onClick={handleImport} disabled={loading} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg hover:bg-[#7a4a2a]">{loading ? '匯入中...' : '確認匯入'}</button>
                    <button onClick={() => setResults(null)} className="px-6 py-3 border border-[#DDD0B0] rounded-lg">返回</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`p-4 rounded-lg ${results.failed === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}><p className="font-medium">匯入完成：成功 {results.success} 個，失敗 {results.failed} 個</p></div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {results.results?.map((r, i) => (<div key={i} className={`p-2 rounded ${r.success ? 'bg-green-100' : 'bg-red-100'}`}><span className={r.success ? 'text-green-700' : 'text-red-700'}>{r.success ? '✅' : '❌'} {r.name}</span>{r.error && <span className="text-red-600 text-sm ml-2">- {r.error}</span>}</div>))}
                  </div>
                  <button onClick={onClose} className="w-full bg-[#9B6035] text-white py-3 rounded-lg">關閉</button>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-[#AA7A50] text-sm mb-2">貼上或輸入 JSON 陣列：</p>
              <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={12} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010] font-mono text-sm" placeholder={sampleJson} />
              <div className="flex gap-2 mt-4">
                <button onClick={handlePreview} disabled={!jsonInput.trim()} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg hover:bg-[#7a4a2a] disabled:opacity-50">預覽</button>
                <button onClick={onClose} className="px-6 py-3 border border-[#DDD0B0] rounded-lg">取消</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
