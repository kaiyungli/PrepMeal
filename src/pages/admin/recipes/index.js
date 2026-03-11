'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const colors = {
  brown: '#264653',
  cream: '#F8F3E8',
  primary: '#9B6035',
  secondary: '#C8D49A',
  accent: '#F0A060',
};

export default function AdminRecipes() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth via API
    fetch('/api/admin/check')
      .then(res => {
        if (res.ok) {
          setIsAdmin(true);
        } else {
          router.push('/admin/login');
        }
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('全部');
  const [dishTypeFilter, setDishTypeFilter] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    fetch('/api/admin/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data.recipes || data))
      .catch(() => {});
  }, []);

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuisine = cuisineFilter === '全部' || r.cuisine === cuisineFilter;
    const matchesDishType = dishTypeFilter === '全部' || r.dish_type === dishTypeFilter;
    return matchesSearch && matchesCuisine && matchesDishType;
  });

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) return <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">載入中...</div>;
  if (!isAdmin) return null;

  return (
    <>
      <Header />
      <Head><title>食譜管理 - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8]">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
          <div className="flex justify-between items-center mb-6">
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.brown }}>食譜管理</h1>
            <div className="flex gap-3">
              <button onClick={() => { setEditingRecipe(null); setShowModal(true); }} style={{ background: colors.primary, color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ 新增食譜</button>
              <button onClick={handleLogout} style={{ background: 'transparent', color: colors.primary, padding: '10px 20px', border: `1px solid ${colors.primary}`, borderRadius: '8px', cursor: 'pointer' }}>登出</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap gap-4 mb-6">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋食譜..." style={{ flex: '1 1 200px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #DDD0B0' }} />
              <select value={cuisineFilter} onChange={e => setCuisineFilter(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #DDD0B0' }}>
                <option>全部</option><option>中菜</option><option>西菜</option><option>日菜</option><option>韓菜</option>
              </select>
              <select value={dishTypeFilter} onChange={e => setDishTypeFilter(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #DDD0B0' }}>
                <option>全部</option><option>主菜</option><option>配菜</option><option>湯</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredRecipes.map(recipe => (
                <div key={recipe.id} style={{ background: colors.cream, borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '160px', background: recipe.image_url ? `url(${recipe.image_url}) center/cover` : '#ddd' }} />
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.brown, marginBottom: '8px' }}>{recipe.name}</h3>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {recipe.cuisine && <span style={{ fontSize: '12px', background: colors.secondary, padding: '4px 8px', borderRadius: '4px' }}>{recipe.cuisine}</span>}
                      {recipe.difficulty && <span style={{ fontSize: '12px', background: '#E0E0E0', padding: '4px 8px', borderRadius: '4px' }}>{recipe.difficulty}</span>}
                    </div>
                    <button onClick={() => { setEditingRecipe(recipe); setShowModal(true); }} style={{ marginTop: '12px', width: '100%', padding: '8px', borderRadius: '6px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>編輯</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
