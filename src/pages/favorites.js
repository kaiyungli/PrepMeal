'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase?.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        loadFavorites(user.id);
      }
    };
    checkUser();
  }, [router]);

  const loadFavorites = async (userId) => {
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

  const toggleFavorite = async (recipeId) => {
    if (!user) {
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
      <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Head><title>收藏食譜 - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8]">
        {/* Header */}<div className="max-w-[1000px] mx-auto px-5 py-10">
          <h1 className="text-[28px] font-bold text-[#9B6035] mb-2">❤️ 收藏食譜</h1>
          <p className="text-[#AA7A50] mb-8">你收藏既食譜</p>

          {favorites.length === 0 ? (
            <div className="text-center py-[60px] px-5 bg-white rounded-xl shadow/10">
              <p className="text-[48px] mb-4">❤️</p>
              <p className="text-[#AA7A50] mb-6">暫時未有收藏既食譜</p>
              <Link href="/recipes">
                <Button>去睇食譜</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {favorites.map((recipe) => (
                <div key={recipe.id} className="bg-white rounded-xl overflow-hidden shadow-md relative">
                  <button
                    onClick={() => toggleFavorite(recipe.id)}
                    className="absolute top-3 right-3 bg-white border-none rounded-full w-9 h-9 cursor-pointer flex items-center justify-center shadow-md"
                  >
                    <span className="text-lg">❤️</span>
                  </button>
                  <div style={{ height: '140px', background: recipe.image_url ? `url(${recipe.image_url})` : '#f0f0f0', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-[#9B6035] mb-2">{recipe.name}</h3>
                    <p className="text-sm text-[#AA7A50] mb-3">{recipe.cooking_time}分鐘 · {recipe.calories} kcal</p>
                    <div className="flex gap-1.5">
                      {recipe.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="bg-[#F0A060] text-white px-2 py-0.5 rounded text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="text-center py-10 text-[#AA7A50] border-t border-gray-200 bg-[#F8F3E8]">
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
