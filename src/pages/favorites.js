'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import RecipeList from '@/components/RecipeList';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useUserState, getFavoriteRecipes } from '@/hooks/useUserState';

export default function FavoritesPage() {
  const headerCtrl = useHeaderController();
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

  // Performance timing
  const firstLoadStartRef = useRef(Date.now());
  const dataReadyLogged = useRef(false);

  // Log page load metrics on mount
  useEffect(() => {
    console.log('[perf] favorites.first_load.ready', {
      duration_ms: Math.round(Date.now() - firstLoadStartRef.current)
    });
  }, []);

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
        const recipesFetchStart = Date.now();
        console.log('[favorites-page] recipes_fetch_start', {
          url: '/api/recipes?limit=100'
        });

        // Use public recipes endpoint
        const res = await fetch('/api/recipes?limit=100');

        console.log('[favorites-page] recipes_response_received', {
          duration_ms: Math.round(Date.now() - recipesFetchStart),
          status: res.status
        });

        const data = await res.json();
        const recipesData = data?.recipes || [];

        console.log('[favorites-page] recipes_json_parsed', {
          duration_ms: Math.round(Date.now() - recipesFetchStart),
          count: recipesData.length
        });

        setAllRecipes(recipesData);
      } catch (err) {
        console.error('Failed to load recipes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [isAuthenticated]);

  // Log when favorite data is ready
  useEffect(() => {
    if (dataReadyLogged.current) return;
    if (loading) return;
    dataReadyLogged.current = true;

    console.log('[perf] favorites.first_load.data_ready', {
      duration_ms: Math.round(Date.now() - firstLoadStartRef.current),
      meta: {
        favoriteIdsCount: favorites?.length || 0,
        allRecipesCount: allRecipes.length,
        favoriteRecipesCount: favoriteRecipes.length,
      }
    });
  }, [loading, favorites?.length, allRecipes.length]);

  // Derive favorite recipes from allRecipes + favorites (PURE DERIVED)
  // Updates INSTANTLY when favorites changes - no additional fetch
  const favoriteRecipes = useMemo(() => {
    return getFavoriteRecipes(allRecipes, favorites);
  }, [allRecipes, favorites]);

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <Header {...headerCtrl} />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">載入中...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header {...headerCtrl} />

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