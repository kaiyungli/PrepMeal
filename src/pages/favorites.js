'use client';
import { useEffect, useMemo, useRef } from 'react';
import { startFavoritesTiming, finishFavoritesTiming } from '@/utils/favoritesTiming';
import { useAccountFavorites } from '@/hooks/useFavorites';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import RecipeList from '@/components/RecipeList';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useNavigationDataReady } from '@/features/performance/useNavigationDataReady';

export default function FavoritesPage() {
  const headerCtrl = useHeaderController();
  const auth = useAuthGuard();
  const { loading: authLoading, isAuthenticated } = auth;
  return <AccountFavoritesPage key={JSON.stringify([isAuthenticated, auth.user?.id])} auth={auth} headerCtrl={headerCtrl} authLoading={authLoading} />;
}

function AccountFavoritesPage({ auth, headerCtrl, authLoading }) {
  const { isAuthenticated } = auth;
  const { recipes: favoriteRecipes, loading, hasLoaded, refreshing, error, mutationError, isFavorite, isPending, setFavorite, retry } = useAccountFavorites(auth, { includeRecipes: true });
  const handleFavoriteClick = (id) => setFavorite(id, false);
  useNavigationDataReady('favorites', !authLoading && isAuthenticated && !loading && !refreshing, Boolean(error));
  const timing = useRef(null);
  useEffect(() => { timing.current = startFavoritesTiming(); }, []);
  useEffect(() => {
    if (!authLoading && isAuthenticated && !loading && !error && timing.current !== null) {
      finishFavoritesTiming(timing.current, 'page_ready');
      timing.current = null;
    }
  }, [authLoading, isAuthenticated, loading, error]);

  // Recipe filtering - only filters locally, no refetch
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    recipeFilterSections,
    hasFilters,
    activeFilterCount,
    clearFilters,
    filterRecipes,
  } = useRecipeFilters({ initialShowFilters: false });

  // Local filtered favorites - only recomputes when favorites or filters change
  const filteredFavoriteRecipes = useMemo(
    () => filterRecipes(favoriteRecipes),
    [favoriteRecipes, filterRecipes]
  );

  if (authLoading) {
    return (
      <>
        <Header {...headerCtrl} />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">載入中...</p>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header {...headerCtrl} />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[#AA7A50]">請先登入以查看收藏</p>
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

          {!loading && favoriteRecipes.length > 0 && (
            <RecipeFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              recipeFilterSections={recipeFilterSections}
              hasFilters={hasFilters}
              activeFilterCount={activeFilterCount}
              clearFilters={clearFilters}
            />
          )}

          {mutationError && <p role="alert" className="text-red-700 mb-4">{mutationError}</p>}
          {refreshing && <p role="status" className="text-[#7A746B] mb-4">正在更新收藏...</p>}
          {error && hasLoaded && <div role="alert" className="text-red-700 mb-4">{error} <button onClick={retry} className="underline">重試</button></div>}
          {error && !hasLoaded ? (
            <div className="text-center py-20" role="alert">
              <p className="text-red-700 mb-4">{error}</p>
              <button onClick={retry} className="text-[#9B6035] font-medium hover:underline">重試</button>
            </div>
          ) : loading ? (
            <div className="text-center py-20">
              <p className="text-[#AA7A50]">正在載入收藏...</p>
            </div>
          ) : favoriteRecipes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B] mb-4">你仲未收藏任何食譜</p>
              <Link href="/recipes" className="text-[#9B6035] font-medium hover:underline">
                去搵啱你嘅食譜 →
              </Link>
            </div>
          ) : filteredFavoriteRecipes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#7A746B] mb-4">暫時冇符合條件嘅收藏食譜</p>
              <button 
                onClick={clearFilters}
                className="text-[#9B6035] font-medium hover:underline"
              >
                清除篩選 →
              </button>
            </div>
          ) : (
            <RecipeList
              recipes={filteredFavoriteRecipes}
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
