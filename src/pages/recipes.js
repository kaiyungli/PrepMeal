import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout, Card, Modal } from '@/components';
import supabase from '@/lib/supabase';

export default function RecipesPage({ initialRecipes }) {
  const [recipes, setRecipes] = useState(initialRecipes || []);
  
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
      
      <div className="max-w-[1000px] mx-auto px-5 py-10">
        <h1 className="text-[28px] font-bold text-[#264653] mb-2">全部食譜</h1>
        <p className="text-gray-500 mb-8">共 {recipes.length} 款食譜</p>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
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
          <p className="text-sm text-gray-500 mb-4">
              {selectedRecipe.cooking_time}分鐘 · {selectedRecipe.difficulty} · {selectedRecipe.calories} kcal
            </p>
            <p className="text-sm text-[#264653] mb-4">
              {selectedRecipe.description}
            </p>
          </div>
        )}
      </Modal>
    </Layout>
  );
}


export async function getServerSideProps() {
  try {
    // Direct Supabase query without client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id,name,slug,description,image_url,cuisine,dish_type,method,speed,difficulty,calories_per_serving')
      .eq('is_public', true)
      .limit(50);
    
    return {
      props: {
        initialRecipes: recipes || [],
      },
    };
  } catch (e) {
    return {
      props: {
        initialRecipes: [],
      },
    };
  }
}
