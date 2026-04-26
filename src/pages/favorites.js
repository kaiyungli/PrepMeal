'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import RecipeList from '@/components/RecipeList';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function FavoritesPage() {
  const headerCtrl = useHeaderController();
  // Only need auth guard for authentication check
  const {
    loading: authLoading,
    isAuthenticated,
    getAccessToken,
  } = useAuthGuard();

  // Local state for favorites page
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [pendingIds, setPendingIds] = useState(new Set());
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

  // Fetch favorite recipes on mount
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchFavoriteRecipes = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const fetchStart = Date.now();
        console.log('[favorites-page] favorite_recipes_fetch_start', {
          url: '/api/user/favorites?include=recipes'
        });

        const res = await fetch('/api/user/favorites?include=recipes', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('[favorites-page] favorite_recipes_response_received', {
          duration_ms: Math.round(Date.now() - fetchStart),
          status: res.status
        });

        const data = await res.json();
        const ids = data?.data?.favorites || [];
        const recipes = data?.data?.recipes || [];

        console.log('[favorites-page] favorite_recipes_json_parsed', {
          duration_ms: Math.round(Date.now() - fetchStart),
          count: recipes.length
        });

        setFavoriteIds(ids.map(String));
        setFavoriteRecipes(recipes);
      } catch (err) {
        console.error('Failed to load favorite recipes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteRecipes();
  }, [isAuthenticated, getAccessToken]);

  // Log when favorite data is ready
  useEffect(() => {
    if (dataReadyLogged.current) return;
    if (loading) return;
    dataReadyLogged.current = true;

    console.log('[perf] favorites.first_load.data_ready', {
      duration_ms: Math.round(Date.now() - firstLoadStartRef.current),
      meta: {
        favoriteIdsCount: favoriteIds.length,
        favoriteRecipesCount: favoriteRecipes.length,
      }
    });
  }, [loading, favoriteIds.length, favoriteRecipes.length]);

  // Local helpers
  const favoriteIdSet = useMemo(
    () => new Set((favoriteIds || []).map(String)),
    [favoriteIds]
  );

  const isFavorite = useCallback((recipeId) => {
    return favoriteIdSet.has(String(recipeId));
  }, [favoriteIdSet]);

  const isPending = useCallback((recipeId) => {
    return pendingIds.has(String(recipeId));
  }, [pendingIds]);

  // Local unfavorite handler - removes card immediately
  const handleFavoriteClick = useCallback(async (recipeId) => {
    const id = String(recipeId);
    if (pendingIds.has(id)) return false;
    if (!favoriteIdSet.has(id)) return false;

    setPendingIds(prev => new Set(prev).add(id));

    const previousIds = [...favoriteIds];
    const previousRecipes = [...favoriteRecipes];

    // Optimistic remove
    setFavoriteIds(prev => prev.filter(x => String(x) !== id));
    setFavoriteRecipes(prev => prev.filter(r => String(r.id) !== id));

    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/user/favorites?recipe_id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        setFavoriteIds(previousIds);
        setFavoriteRecipes(previousRecipes);
        return false;
      }

      return true;
    } catch (err) {
      setFavoriteIds(previousIds);
      setFavoriteRecipes(previousRecipes);
      return false;
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [favoriteIds, favoriteRecipes, favoriteIdSet, pendingIds, getAccessToken]);

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