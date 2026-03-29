'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/layout/Header';
import RecipeForm from '@/components/admin/RecipeForm';
import ImportModal from '@/components/admin/ImportModal';

const cuisineOptions = ['chinese', 'western', 'japanese', 'korean', 'thai', 'taiwanese', 'indian', 'italian', 'fusion'];
const dishTypeOptions = ['main', 'side', 'soup', 'staple', 'snack', 'dessert'];

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
  const [listError, setListError] = useState('');
  const [deletingRecipe, setDeletingRecipe] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleSave = async () => {
    try {
      setListError('');
      const res = await fetch('/api/admin/recipes');
      if (!res.ok) throw new Error('Failed to refresh recipes');
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (err) {
      console.error('[handleSave] Refetch failed:', err);
      setListError('已儲存食譜，但刷新列表失敗，請手動刷新頁面');
    }
    setView('list');
    setEditingRecipe(null);
  };

  const handleDeleteClick = (recipe) => {
    setDeletingRecipe(recipe);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecipe) return;
    setDeleting(true);
    try {
      const url = `/api/admin/recipes?id=${deletingRecipe.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '刪除失敗');
      }
      setRecipes(prev => prev.filter(r => r.id !== deletingRecipe.id));
      setDeletingRecipe(null);
      alert('食譜已刪除');
    } catch (err) {
      console.error('[DELETE] Error:', err);
      alert('刪除失敗: ' + err.message);
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
              {listError && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
                  {listError}
                </div>
              )}
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