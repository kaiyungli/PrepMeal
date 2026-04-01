'use client';
import { useState, useEffect } from 'react';
import RecipeIngredientsEditor from './RecipeIngredientsEditor';
import RecipeStepsEditor from './RecipeStepsEditor';

const cuisineOptions = ['chinese', 'western', 'japanese', 'korean', 'thai', 'fusion'];
const dishTypeOptions = ['main', 'side', 'soup', 'staple', 'snack'];
const difficultyOptions = ['easy', 'medium', 'hard'];
const methodOptions = ['stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked'];
const speedOptions = ['quick', 'normal', 'slow'];
const mealRoleOptions = ['complete_meal', 'protein_main', 'veg_side', 'protein_side', 'soup'];
const primaryProteinOptions = ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'tofu', 'egg', 'vegetarian', 'mixed'];
const budgetLevelOptions = ['budget', 'normal', 'premium'];
export default function RecipeForm({ recipe, existingRecipes = [], onSave, onCancel }) {
  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    name: '', slug: '', description: '', cuisine: 'chinese', dish_type: 'main', difficulty: 'easy',
    prep_time: 15, cook_time: 20, servings: 2, image_url: '', calories_per_serving: '', is_public: true,
    method: 'stir_fry', speed: 'normal',
    servings_unit: 'portion', meal_role: '', is_complete_meal: false, primary_protein: '', budget_level: '', reuse_group: '',
    ingredients: [], steps: [],
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

      // Step 1: Get upload URL
      const res = await fetch('/api/admin/uploads/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType: file.type }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');

      const data = await res.json();
      const { uploadUrl, publicUrl } = data;
      if (!uploadUrl || !publicUrl) throw new Error('Invalid upload response');

      // Step 2: Upload to storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('Failed to upload image');

      // Step 3: Update form
      handleChange('image_url', publicUrl);
    } catch (err) {
      console.error('[handleImageUpload] Error:', err);
      setError('圖片上傳失敗: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (recipe) {
      const formIngredients = (recipe.ingredients || []).map(i => ({
        ingredient_id: i.ingredient_id || i.ingredients?.id || null,
        ingredient_name: i.ingredient_name || i.ingredients?.name || i.name || '',
        quantity: i.quantity || '',
        unit_id: i.unit_id || null,
        is_optional: i.is_optional || false,
        notes: i.notes || i.prep_note || '',
        group_key: i.group_key || ''
      }));
      const formSteps = (recipe.steps || []).map(s => ({ text: s.text || s.instruction || '', time_seconds: s.time_seconds || '' }));

      // Map DB column names to form field names
      // DB: prep_time_minutes, cook_time_minutes, base_servings -> Form: prep_time, cook_time, servings
      

      const formData = {
        ...recipe,
        prep_time: recipe.prep_time_minutes || recipe.prep_time || 15,
        cook_time: recipe.cook_time_minutes || recipe.cook_time || 20,
        servings: recipe.base_servings || recipe.servings || 2,
        method: recipe.method || 'stir_fry',
        speed: recipe.speed || 'normal',
        servings_unit: recipe.servings_unit || 'portion',
        meal_role: recipe.meal_role || '',
        is_complete_meal: recipe.is_complete_meal || false,
        primary_protein: recipe.primary_protein || '',
        budget_level: recipe.budget_level || '',
        reuse_group: recipe.reuse_group || '',
        ingredients: formIngredients,
        steps: formSteps,
        
      };
      setForm(formData);
    }
  }, [recipe]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    
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
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">烹調方式</label>
            <select value={form.method} onChange={e => handleChange('method', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{methodOptions.map(m => <option key={m} value={m}>{m}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">時間類型</label>
            <select value={form.speed} onChange={e => handleChange('speed', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{speedOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">公開</label>
            <select value={form.is_public ? 'true' : 'false'} onChange={e => handleChange('is_public', e.target.value === 'true')} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]"><option value="true">是</option><option value="false">否</option></select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">份量單位</label>
            <input value={form.servings_unit || ''} onChange={e => handleChange('servings_unit', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="portion" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">餐點角色</label>
            <select value={form.meal_role || ''} onChange={e => handleChange('meal_role', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{mealRoleOptions.map(m => <option key={m} value={m}>{m}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">完整餐點</label>
            <select value={form.is_complete_meal ? 'true' : 'false'} onChange={e => handleChange('is_complete_meal', e.target.value === 'true')} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]"><option value="true">是</option><option value="false">否</option></select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">主要蛋白質</label>
            <select value={form.primary_protein || ''} onChange={e => handleChange('primary_protein', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{primaryProteinOptions.map(p => <option key={p} value={p}>{p}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">預算級別</label>
            <select value={form.budget_level || ''} onChange={e => handleChange('budget_level', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">{budgetLevelOptions.map(b => <option key={b} value={b}>{b}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#AA7A50] mb-1">重用組</label>
            <input value={form.reuse_group || ''} onChange={e => handleChange('reuse_group', e.target.value)} className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" placeholder="可選" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#3A2010] mb-4">⏱️ 時間與份量</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <RecipeIngredientsEditor
        ingredients={ingredients}
        units={units}
        formIngredients={form.ingredients}
        onAddIngredient={addIngredient}
        onRemoveIngredient={removeIngredient}
        onUpdateIngredient={updateIngredient}
      />

      <RecipeStepsEditor
        formSteps={form.steps}
        onAddStep={addStep}
        onRemoveStep={removeStep}
        onUpdateStep={updateStep}
        onMoveStep={moveStep}
      />

      <div className="flex gap-3 pt-4 border-t border-[#DDD0B0]">
        <button type="submit" disabled={saving} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg font-medium hover:bg-[#7a4a2a] disabled:opacity-50">{saving ? '儲存中...' : (recipe ? '更新食譜' : '新增食譜')}</button>
        <button type="button" onClick={onCancel} className="px-6 py-3 border border-[#DDD0B0] text-[#3A2010] rounded-lg hover:bg-[#F8F3E8]">取消</button>
      </div>
    </form>
  );
}