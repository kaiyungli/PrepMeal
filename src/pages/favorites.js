'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import supabase from '@/lib/supabase';
import { Button } from '@/components';

const colors = {
  background: '#F8F3E8',
  primary: '#9B6035',
  secondary: '#C8D49A',
  accent: '#F0A060',
  text: '#3A2010',
  textLight: '#AA7A50',
  cream: '#F8F3E8',
  lightBg: '#F8F3E8',
  white: '#FFFFFF',
  sage: '#C8D49A',
  brown: '#9B6035',
  yellow: '#F0A060',
};

// Static recipes data
const allRecipes = [
  { id: 4, name: "番茄炒蛋", cooking_time: 5, difficulty: "易", cuisine: "中式", calories: 180, description: "經典廣東小菜，酸甜開胃", tags: ["簡易", "送飯"], image_url: "https://img.cook1cook.com/upload/cover/15/91/9779914994051761591.jpg" },
  { id: 5, name: "麻婆豆腐", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 280, description: "四川經典麻辣豆腐", tags: ["辣", "送飯"], image_url: "https://www.christinesrecipes.com/wp-content/uploads/2010/01/Mapo-Tofu.jpg" },
  { id: 6, name: "蔥花蒸水蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 120, description: "滑嫩蒸蛋，香蔥提味", tags: ["健康", "簡易"], image_url: "https://kikkomanusa.com/chinese/wp-content/uploads/sites5/2022/01/31040_Chinese-Steamed-Eggs.jpg" },
  { id: 7, name: "魚香茄子", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 180, description: "魚香味道濃郁", tags: ["送飯", "中式"], image_url: "" },
  { id: 8, name: "鼓汁蒸排骨", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 320, description: "嫩滑排骨，豉香濃郁", tags: ["蒸", "送飯"], image_url: "" },
  { id: 9, name: "韭菜炒蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 150, description: "簡單快手小炒", tags: ["簡易", "健康"], image_url: "" },
  { id: 10, name: "咖喱薯仔炆雞翼", cooking_time: 30, difficulty: "中", cuisine: "中式", calories: 380, description: "咖喱香濃，雞翼入味", tags: ["送飯", "咖喱"], image_url: "" }
];

export default function FavoritesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);

  const loadFavorites = async (userId) => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', userId);

    if (!error && data) {
      const ids = data.map(f => f.recipe_id);
      setFavoriteIds(ids);
      setFavorites(allRecipes.filter(r => ids.includes(r.id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        router.push('/login');
        return;
      }

      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user;

      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        await loadFavorites(currentUser.id);
      }
    };

    checkUser();
  }, [router]);

  const toggleFavorite = async (recipeId) => {
    if (!user || !supabase) {
      router.push('/login');
      return;
    }

    const isFavorited = favoriteIds.includes(recipeId);

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId);

      setFavoriteIds(prev => prev.filter(id => id !== recipeId));
      setFavorites(prev => prev.filter(r => r.id !== recipeId));
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, recipe_id: recipeId });

      setFavoriteIds(prev => [...prev, recipeId]);
      const recipe = allRecipes.find(r => r.id === recipeId);
      if (recipe) setFavorites(prev => [...prev, recipe]);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Head><title>收藏食譜 - 今晚食乜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}<div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.brown, marginBottom: '8px' }}>❤️ 收藏食譜</h1>
          <p style={{ color: colors.textLight, marginBottom: '32px' }}>你收藏既食譜</p>

          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>❤️</p>
              <p style={{ color: colors.textLight, marginBottom: '24px' }}>暫時未有收藏既食譜</p>
              <Link href="/recipes">
                <Button>去睇食譜</Button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {favorites.map((recipe) => (
                <div key={recipe.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', position: 'relative' }}>
                  <button
                    onClick={() => toggleFavorite(recipe.id)}
                    style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    <span style={{ fontSize: '18px' }}>❤️</span>
                  </button>
                  <div style={{ height: '140px', background: recipe.image_url ? `url(${recipe.image_url})` : '#f0f0f0', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.brown, marginBottom: '8px' }}>{recipe.name}</h3>
                    <p style={{ fontSize: '13px', color: colors.textLight, marginBottom: '12px' }}>{recipe.cooking_time}分鐘 · {recipe.calories} kcal</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {recipe.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} style={{ background: colors.yellow, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
