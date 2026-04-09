'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import RecipeList from '@/components/RecipeList';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useUserState, getFavoriteRecipes } from '@/hooks/useUserState';

export default function FavoritesPage() {
  // Protected page - useAuthGuard handles redirect to login
  const { loading: authLoading } = useAuthGuard();

  // Central user state
  const { 
    favorites,
    isAuthenticated,
    isFavorite,
    isPending,
    toggleFavorite,
  } = useUserState();

  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle favorite toggle
  const handleFavoriteClick = useCallback((recipeId) => {
    return toggleFavorite(recipeId);
  }, [toggleFavorite]);

  // Fetch recipes once on mount (public recipes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchRecipes = async () => {
      setLoading(true);
      try {
        // Use public recipes endpoint
        const res = await fetch('/api/recipes?limit=100');
        const data = await res.json();
        const recipesData = data?.recipes || [];
        setAllRecipes(recipesData);
      } catch (err) {
        console.error('Failed to load recipes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [isAuthenticated]);

  // Derive favorite recipes from allRecipes + favorites (PURE DERIVED)
  // Updates INSTANTLY when favorites changes - no additional fetch
  const favoriteRecipes = useMemo(() => {
    return getFavoriteRecipes(allRecipes, favorites);
  }, [allRecipes, favorites]);

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
          ) : favoriteRecipes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B] mb-4">你仲未收藏任何食譜</p>
              <a href="/recipes" className="text-[#9B6035] font-medium hover:underline">
                去搵啱你嘅食譜 →
              </a>
            </div>
          ) : (
            <RecipeList
              recipes={favoriteRecipes}
              isFavorite={isFavorite}
              isPending={isPending}
              onFavoriteClick={handleFavoriteClick}
            />
          )}
        </div>
      </div>
    </>
  );
}