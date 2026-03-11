import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout, Modal } from '@/components';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';

import supabase from '@/lib/supabase';

export default function RecipesPage({ initialRecipes }) {
  const router = useRouter();
  const [recipes, setRecipes] = useState(initialRecipes || []);
  
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
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

  // Handle ingredient-based sorting
  useEffect(() => {
    const { ingredients } = router.query;
    if (!ingredients || !initialRecipes?.length) return;

    const userIngredients = ingredients.toString().split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
    if (userIngredients.length === 0) return;

    // Score each recipe using actual ingredients_list
    const scored = initialRecipes.map(recipe => {
      const ingredientsList = recipe.ingredients_list || [];
      const ingredientText = ingredientsList.join(' ').toLowerCase();
      
      // Also include name/description for fallback
      const searchText = [
        ingredientText,
        recipe.name,
        recipe.description,
        recipe.cuisine,
        recipe.method,
        recipe.dish_type,
        recipe.primary_protein
      ].filter(Boolean).join(' ').toLowerCase();

      let matchCount = 0;
      userIngredients.forEach(ing => {
        if (searchText.includes(ing)) matchCount++;
      });

      // Use actual recipe ingredients for ratio
      const totalRecipeIngredients = ingredientsList.length || 1;
      const matchRatio = Math.min(matchCount / totalRecipeIngredients, 1);
      let score = matchRatio;
      if (recipe.primary_protein && userIngredients.some(ing => recipe.primary_protein.toLowerCase().includes(ing))) score += 0.2;
      if (recipe.speed === 'quick') score += 0.1;

      return { ...recipe, matchScore: score, matchRatio };
    });

    // Filter >= 0.3 and sort
    const filtered = scored.filter(r => r.matchScore >= 0.3).sort((a, b) => b.matchScore - a.matchScore);
    setRecipes(filtered.length > 0 ? filtered : initialRecipes);
  }, [router.query.ingredients]);

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
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => {
                setModalLoading(true);
                fetch('/api/recipes/' + recipe.id).then(res => res.json()).then(fullRecipe => {
                  console.log('Full recipe:', fullRecipe);
                  if (fullRecipe.error) {
                    alert('Error: ' + fullRecipe.error);
                  }
                  setSelectedRecipe(fullRecipe);
                  setModalLoading(false);
                }).catch(err => {
                  console.error('Error:', err);
                  alert('Error loading recipe');
                  setModalLoading(false);
                });
              }}
              onFavorite={() => toggleFavorite(recipe.id)}
            />
          ))}
        </div>
      </div>

      <RecipeDetailModal 
        isOpen={!!selectedRecipe} 
        onClose={() => setSelectedRecipe(null)} 
        recipe={selectedRecipe}
        loading={modalLoading}
      />
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
      .select('id,name,slug,description,image_url,cuisine,dish_type,method,speed,difficulty,calories_per_serving,protein')
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
