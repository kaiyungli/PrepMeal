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

export default function RecipesPage({ initialRecipes }) {
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
    setSelectedRecipe({ ...recipe });
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
    recipeFilterSections,
    hasFilters,
    activeFilterCount,
    clearFilters,
    filters,
  } = useRecipeFilters();

  const { recipes, loading, fetchError } = useFilteredRecipes(
    initialRecipes || [],
    { filters, searchQuery, sortBy, limit: 100 }
  );
  
  const showEmptyState = hasFilters && !loading && recipes.length === 0;
  const showResults = !loading && recipes.length > 0;

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
  // Initial SSR recipes still load for fast first paint
  const { fetchRecipesForServer } = await import('@/lib/recipesServer');
  try {
    const initialRecipes = await fetchRecipesForServer(24);
    return { props: { initialRecipes } };
  } catch (err) {
    return { props: { initialRecipes: [] } };
  }
}