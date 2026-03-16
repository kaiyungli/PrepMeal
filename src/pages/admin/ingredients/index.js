'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/layout/Header';

const categoryOptions = ['肉類', '海鮮', '蛋', '豆腐', '蔬菜', '主食', '調味料', '其他'];

function IngredientForm({ ingredient, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    aliases: '',
    shopping_category: '其他',
    is_pantry_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ingredient) {
      setForm({
        name: ingredient.name || '',
        slug: ingredient.slug || '',
        aliases: Array.isArray(ingredient.aliases) ? ingredient.aliases.join(', ') : (ingredient.aliases || ''),
        shopping_category: ingredient.shopping_category || '其他',
        is_pantry_default: ingredient.is_pantry_default || false,
      });
    }
  }, [ingredient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.name?.trim()) return setError('請輸入食材名稱');
    if (!form.slug?.trim()) return setError('請輸入 slug');
    
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        aliases: form.aliases.split(',').map(a => a.trim()).filter(Boolean),
        shopping_category: form.shopping_category,
        is_pantry_default: form.is_pantry_default,
      };
      
      const url = ingredient?.id ? `/api/admin/ingredients?id=${ingredient.id}` : '/api/admin/ingredients';
      const method = ingredient?.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      
      onSave(data.ingredient || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-lg">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#AA7A50] mb-1">食材名稱 *</label>
          <input 
            value={form.name} 
            onChange={e => {
              setForm({ ...form, name: e.target.value });
              if (!ingredient) {
                setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '') }));
              }
            }} 
            className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" 
            placeholder="例如: 牛肉"
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#AA7A50] mb-1">Slug *</label>
          <input 
            value={form.slug} 
            onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '') })} 
            className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" 
            placeholder="beef"
            required 
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[#AA7A50] mb-1">別名 (用逗號分隔)</label>
          <input 
            value={form.aliases} 
            onChange={e => setForm({ ...form, aliases: e.target.value })} 
            className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" 
            placeholder="例如: 牛腩, 牛腱, 牛肉片"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#AA7A50] mb-1">購物分類</label>
          <select 
            value={form.shopping_category} 
            onChange={e => setForm({ ...form, shopping_category: e.target.value })} 
            className="w-full px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]"
          >
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-2 text-sm text-[#AA7A50] mt-6">
            <input 
              type="checkbox" 
              checked={form.is_pantry_default} 
              onChange={e => setForm({ ...form, is_pantry_default: e.target.checked })}
              className="rounded"
            />
            預設加入食材庫
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-[#DDD0B0]">
        <button type="submit" disabled={saving} className="flex-1 bg-[#9B6035] text-white py-3 rounded-lg font-medium hover:bg-[#7a4a2a] disabled:opacity-50">
          {saving ? '儲存中...' : (ingredient ? '更新食材' : '新增食材')}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 border border-[#DDD0B0] text-[#3A2010] rounded-lg hover:bg-[#F8F3E8]">
          取消
        </button>
      </div>
    </form>
  );
}

export default function AdminIngredients() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [ingredients, setIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingIngredient, setEditingIngredient] = useState(null);

  useEffect(() => {
    fetch('/api/admin/check')
      .then(res => res.ok ? setIsAdmin(true) : router.push('/admin/login'))
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      fetchIngredients();
    }
  }, [isAdmin]);

  const fetchIngredients = () => {
    fetch('/api/admin/ingredients')
      .then(res => res.json())
      .then(data => setIngredients(data.ingredients || []))
      .catch(err => console.error('Failed:', err));
  };

  const filteredIngredients = ingredients.filter(i => {
    const matchSearch = !searchTerm || 
      i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'all' || i.shopping_category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleNew = () => {
    setEditingIngredient(null);
    setView('form');
  };

  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setView('form');
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除這個食材嗎？')) return;
    try {
      const res = await fetch(`/api/admin/ingredients?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setIngredients(ingredients.filter(i => i.id !== id));
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  const handleSave = (saved) => {
    if (editingIngredient) {
      setIngredients(ingredients.map(i => i.id === saved.id ? saved : i));
    } else {
      setIngredients([saved, ...ingredients]);
    }
    setView('list');
    setEditingIngredient(null);
  };

  if (loading) return <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center"><span className="text-[#9B6035]">載入中...</span></div>;
  if (!isAdmin) return null;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F8F3E8] pb-20">
        <div className="bg-[#9B6035] px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-white text-xl font-bold">🥬 食材管理</h1>
            <button onClick={() => router.push('/admin/recipes')} className="text-white/80 hover:text-white text-sm">← 食譜管理</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          {view === 'form' ? (
            <div>
              <button onClick={() => { setView('list'); setEditingIngredient(null); }} className="mb-4 text-[#9B6035] hover:underline">← 返回列表</button>
              <IngredientForm ingredient={editingIngredient} onSave={handleSave} onCancel={() => { setView('list'); setEditingIngredient(null); }} />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋食材..." className="flex-1 min-w-[200px] px-4 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]" />
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-[#DDD0B0] rounded-lg text-[#3A2010]">
                    <option value="all">全部分類</option>
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={handleNew} className="bg-[#9B6035] text-white px-5 py-2 rounded-lg hover:bg-[#7a4a2a]">+ 新增食材</button>
                </div>
                <p className="text-[#AA7A50] text-sm mt-2">{filteredIngredients.length} 個食材</p>
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F8F3E8]">
                    <tr>
                      <th className="text-left px-4 py-3 text-[#AA7A50] font-medium">名稱</th>
                      <th className="text-left px-4 py-3 text-[#AA7A50] font-medium">Slug</th>
                      <th className="text-left px-4 py-3 text-[#AA7A50] font-medium">分類</th>
                      <th className="text-left px-4 py-3 text-[#AA7A50] font-medium">別名</th>
                      <th className="text-center px-4 py-3 text-[#AA7A50] font-medium">預設</th>
                      <th className="text-right px-4 py-3 text-[#AA7A50] font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.map(ing => (
                      <tr key={ing.id} className="border-t border-[#F0E8D8] hover:bg-[#FDFBF7]">
                        <td className="px-4 py-3 text-[#3A2010] font-medium">{ing.name}</td>
                        <td className="px-4 py-3 text-[#AA7A50] text-sm font-mono">{ing.slug}</td>
                        <td className="px-4 py-3 text-[#3A2010]">{ing.shopping_category}</td>
                        <td className="px-4 py-3 text-[#AA7A50] text-sm">{Array.isArray(ing.aliases) ? ing.aliases.join(', ') : ing.aliases}</td>
                        <td className="px-4 py-3 text-center">{ing.is_pantry_default ? '✅' : ''}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEdit(ing)} className="text-[#9B6035] hover:text-[#7a4a2a] mr-3">編輯</button>
                          <button onClick={() => handleDelete(ing.id)} className="text-red-500 hover:text-red-700">刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredIngredients.length === 0 && (
                  <div className="text-center py-8 text-[#AA7A50]">沒有找到食材</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
