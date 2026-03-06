'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout, Card, Modal } from '@/components';
import supabase from '@/lib/supabase';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  
  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data.recipes || []))
      .catch(console.error);
  }, []);
  
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
              description={`${recipe.cooking_time}分鐘 · ${recipe.calories}kcal · 蛋白${recipe.protein}g · 碳水${recipe.carbs}g`}
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
