'use client';
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import RecipeList from '@/components/RecipeList';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useFavorites } from '@/hooks/useFavorites';

export default function FavoritesPage() {
  // Protected page - useAuthGuard handles redirect to login
  const { isAuthenticated, loading: authLoading, getAccessToken, requireAuth } = useAuthGuard();

  // Get token for SWR
  const [token, setToken] = useState(null);

  useEffect(() => {
    getAccessToken().then(t => setToken(t));
  }, [getAccessToken]);

  // Single source of truth for favorites - SWR-based
  const { favorites, isFavorite, isPending, toggleFavorite } = useFavorites(token);

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle favorite toggle - uses canonical toggleFavorite from useFavorites
  const handleFavoriteClick = useCallback((recipeId) => {
    return toggleFavorite(recipeId);
  }, [toggleFavorite]);

  // Derive full recipe list from canonical favorites - refresh when favorites CHANGE (not just length)
  // Using JSON.stringify of sorted favorites ensures we detect any change
  useEffect(() => {
    if (!isAuthenticated || favorites.length === 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const fetchFavoriteRecipes = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/user/favorites/recipes', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        const recipesData = data?.data?.recipes || data?.recipes || [];
        setRecipes(recipesData);
      } catch (err) {
        console.error('Failed to load favorite recipes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteRecipes();
  }, [isAuthenticated, favorites, getAccessToken]);

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
            <RecipeList
              recipes={recipes}
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