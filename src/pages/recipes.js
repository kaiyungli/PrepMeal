'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout, Card, Modal } from '@/components';
import supabase from '@/lib/supabase';

// Static recipes data
const recipesData = [
  { id: 4, name: "番茄炒蛋", cooking_time: 5, difficulty: "易", cuisine: "中式", calories: 180, description: "經典廣東小菜，酸甜開胃", tags: ["簡易", "送飯"], image_url: "https://img.cook1cook.com/upload/cover/15/91/9779914994051761591.jpg" },
  { id: 5, name: "麻婆豆腐", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 280, description: "四川經典麻辣豆腐", tags: ["辣", "送飯"], image_url: "https://www.christinesrecipes.com/wp-content/uploads/2010/01/Mapo-Tofu.jpg" },
  { id: 6, name: "蔥花蒸水蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 120, description: "滑嫩蒸蛋，香蔥提味", tags: ["健康", "簡易"], image_url: "https://kikkomanusa.com/chinese/wp-content/uploads/sites5/2022/01/31040_Chinese-Steamed-Eggs.jpg" },
  { id: 7, name: "魚香茄子", cooking_time: 15, difficulty: "中", cuisine: "中式", calories: 180, description: "魚香味道濃郁", tags: ["送飯", "中式"], image_url: "" },
  { id: 8, name: "鼓汁蒸排骨", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 320, description: "嫩滑排骨，豉香濃郁", tags: ["蒸", "送飯"], image_url: "" },
  { id: 9, name: "韭菜炒蛋", cooking_time: 10, difficulty: "易", cuisine: "中式", calories: 150, description: "簡單快手小炒", tags: ["簡易", "健康"], image_url: "" },
  { id: 10, name: "咖喱薯仔炆雞翼", cooking_time: 30, difficulty: "中", cuisine: "中式", calories: 380, description: "咖喱香濃，雞翼入味", tags: ["送飯", "咖喱"], image_url: "" }
];

export default function RecipesPage() {
  const [recipes] = useState(recipesData);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [user, setUser] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase?.auth.getUser();
      setUser(user);
      if (user) {
        loadFavorites(user.id);
      }
    };
    checkUser();
  }, []);

  const loadFavorites = async (userId) => {
    const { data } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', userId);
    
    if (data) {
      setFavoriteIds(data.map(f => f.recipe_id));
    }
  };

  const toggleFavorite = async (recipeId) => {
    if (!user) {
      window.location.href = '/login';
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
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, recipe_id: recipeId });
      
      setFavoriteIds(prev => [...prev, recipeId]);
    }
  };

  return (
    <Layout>
      <Head><title>今晚食乜 - 食譜</title></Head>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#264653', marginBottom: '8px' }}>全部食譜</h1>
        <p style={{ color: '#6b7280', marginBottom: '32px' }}>共 {recipes.length} 款食譜</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {recipes.map((recipe) => (
            <Card
              key={recipe.id}
              title={recipe.name}
              description={`${recipe.cooking_time}分鐘 · ${recipe.cuisine} · ${recipe.calories} kcal`}
              image={recipe.image_url}
              tags={recipe.tags}
              favorite={favoriteIds.includes(recipe.id)}
              onFavorite={() => toggleFavorite(recipe.id)}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      </div>

      <Modal isOpen={!!selectedRecipe} title={selectedRecipe?.name} onClose={() => setSelectedRecipe(null)}>
        {selectedRecipe && (
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              {selectedRecipe.cooking_time}分鐘 · {selectedRecipe.difficulty} · {selectedRecipe.calories} kcal
            </p>
            <p style={{ fontSize: '14px', color: '#264653', marginBottom: '16px' }}>
              {selectedRecipe.description}
            </p>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
