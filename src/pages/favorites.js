'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '@/components/layout/Header';
import RecipeCard from '@/components/RecipeCard';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';


import { Toast, useToast } from '@/components/ui/Toast';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [recipes, setRecipes] = useState([]);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type='info') => { setToast({msg, type}); setTimeout(()=>setToast(null), 3000); };
  const [loading, setLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/favorites');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load favorite recipes
  useEffect(() => {
    if (!isAuthenticated) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const fetchFavoriteRecipes = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/user/favorites/recipes');
        const data = await res.json();
        // API returns { success: true, data: { recipes: [...] } }
        const recipesData = data?.data?.recipes || data?.recipes || [];
        if (recipesData) {
          setRecipes(recipesData);
        }
      } catch (err) {
        console.error('Failed to load favorite recipes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteRecipes();
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <Header />
      
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">載入中...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      
      <Head><title>我的收藏 - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <h1 className="text-2xl font-bold text-[#3A2010] mb-6">我的收藏</h1>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-[#AA7A50]">載入中...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B] mb-4">你仲未收藏任何食譜</p>
              <a href="/recipes" className="text-[#9B6035] font-medium hover:underline">
                去搵啱你嘅食譜 →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onFavorite={() => toggleFavorite(recipe.id)}
                  isFavorite={isFavorite(recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
