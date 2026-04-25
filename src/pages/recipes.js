'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeList from '@/components/RecipeList';
import RecipeModalController from '@/components/RecipeModalController';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useUserState } from '@/hooks/useUserState';
import Toast, { useToast } from '@/components/ui/Toast';
import { useFilteredRecipes } from '@/features/recipes/hooks/useFilteredRecipes';
import { perfNow, perfLog, measurePageLoadMetrics } from '@/utils/perf';

export default function RecipesPage({ initialRecipes }) {
  const firstLoadStartRef = useRef(perfNow());
  const dataReadyLogged = useRef(false);
  
  const { 
    isAuthenticated,
    isFavorite,
    toggleFavorite,
    favoritesLoading,
    isPending,
  } = useUserState();
  
  const { toast, showToast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const handleFavoriteToggle = useCallback((recipeId) => {
    if (!isAuthenticated) {
      showToast('請先登入以收藏食譜', 'info');
      return Promise.resolve(false);
    }
    return toggleFavorite(recipeId);
  }, [isAuthenticated, toggleFavorite, showToast]);
  
  const handleRecipeClick = useCallback((recipe) => {
    const start = perfNow();
    setSelectedRecipe({ ...recipe });
    requestAnimationFrame(() => {
      perfLog({
        event: 'interaction',
        stage: 'recipes_modal_open',
        label: 'recipes.modal.open',
        start,
        end: perfNow(),
        meta: { recipeId: recipe.id }
      });
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const modalIsFavorite = selectedRecipe ? isFavorite(selectedRecipe.id) : false;
  const modalIsPending = selectedRecipe ? isPending(selectedRecipe.id) : false;
  const handleModalFavoriteClick = useCallback(() => {
    if (!isAuthenticated) {
      showToast('請先登入以收藏食譜', 'info');
      return;
    }
    if (selectedRecipe?.id) {
      toggleFavorite(selectedRecipe.id);
    }
  }, [isAuthenticated, selectedRecipe, toggleFavorite, showToast]);

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
    filters,
  } = useRecipeFilters();

  const { recipes, totalCount, loading, fetchError } = useFilteredRecipes(
    initialRecipes || [],
    { filters, searchQuery, sortBy, limit: 100 }
  );
  
  // Log page ready
  useEffect(() => {
    perfLog({
      event: 'page_load',
      stage: 'recipes_ready',
      label: 'recipes.first_load.ready',
      start: firstLoadStartRef.current,
      end: perfNow(),
    });
    return measurePageLoadMetrics();
  }, []);
  
  // Log data ready
  useEffect(() => {
    if (recipes.length > 0 && !dataReadyLogged.current) {
      dataReadyLogged.current = true;
      perfLog({
        event: 'page_load',
        stage: 'recipes_data_ready',
        label: 'recipes.first_load.data_ready',
        start: firstLoadStartRef.current,
        end: perfNow(),
        meta: {
          count: recipes.length,
          totalCount,
          hasFilters,
          search: Boolean(searchQuery?.trim()),
          sortBy
        }
      });
    }
  }, [recipes.length, totalCount, hasFilters, searchQuery, sortBy]);
  
  const showErrorState = !loading && fetchError;
  const showEmptyState = hasFilters && !loading && !fetchError && recipes.length === 0;
  const showResults = !loading && !fetchError && recipes.length > 0;
  const resultCountText = hasFilters && totalCount > 0 ? `共 ${totalCount} 個食譜` : '';

  return (
    <Layout>
      <Head><title>食譜 - 今晚食乜</title></Head>

      <div className="min-h-screen bg-[#F8F3E8] py-8">
        <div className="max-w-[1100px] mx-auto px-6 md:px-8 lg:px-10 w-full">
          <div className="w-full">
            <RecipeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            recipeFilterSections={recipeFilterSections || []}
            hasFilters={hasFilters}
            activeFilterCount={activeFilterCount}
            clearFilters={clearFilters}
          />
          </div>

          {loading && (
            <div className="text-center py-16">
              <div className="text-xl text-[#9B6035]">載入中...</div>
            </div>
          )}

          {showErrorState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">⚠️</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">載入食譜失敗</h3>
              <p className="text-sm text-[#C0A080] mb-6">{fetchError}</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
            </div>
          )}

          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
            </div>
          )}

          {showResults && (
            <div className="mt-6">
              <div className="mb-4 text-sm text-[#7A7A7A]">
                共 {totalCount} 個食譜
              </div>
              <RecipeList
                recipes={recipes}
                onRecipeClick={handleRecipeClick}
                isFavorite={isFavorite}
                isPending={isPending}
                onFavoriteClick={handleFavoriteToggle}
              />
            </div>
          )}
        </div>
      </div>

      <RecipeModalController
        selectedRecipe={selectedRecipe}
        onClose={handleCloseModal}
        isFavorite={modalIsFavorite}
        favoriteLoading={modalIsPending}
        onFavoriteClick={handleModalFavoriteClick}
      />

      {toast && <Toast toast={toast} />}
    </Layout>
  );
}

export async function getServerSideProps() {
  const _start = Date.now();
  console.log('[recipes-page] getServerSideProps_start');
  const { fetchRecipesForServer } = await import('@/lib/recipesServer');
  try {
    const initialRecipes = await fetchRecipesForServer(24);
    const duration_ms = Date.now() - _start;
    console.log('[recipes-page] getServerSideProps_done', {
      duration_ms,
      count: initialRecipes?.length || 0
    });
    return { props: { initialRecipes } };
  } catch (err) {
    const duration_ms = Date.now() - _start;
    console.error('[recipes-page] getServerSideProps_failed', {
      duration_ms,
      error: String(err)
    });
    return { props: { initialRecipes: [] } };
  }
}