'use client';
import { useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeList from '@/components/RecipeList';
import RecipeModalController from '@/components/RecipeModalController';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useUserState } from '@/hooks/useUserState';
import Toast, { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServer } from '@/lib/recipesServer';

export default function RecipesPage({ initialRecipes }) {
  // Central user state
  const { 
    isAuthenticated,
    isFavorite,
    toggleFavorite,
    favoritesLoading: isPending,
  } = useUserState();
  
  const { toast, showToast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  
  // Wrapper that checks auth before toggling
  const handleFavoriteToggle = useCallback((recipeId) => {
    if (!isAuthenticated) {
      showToast('請先登入以收藏食譜', 'info');
      return Promise.resolve(false);
    }
    return toggleFavorite(recipeId);
  }, [isAuthenticated, toggleFavorite, showToast]);
  
  // Recipe click - just set selected, modal controller handles detail fetch
  const handleRecipeClick = useCallback((recipe) => {
    setSelectedRecipe({ ...recipe });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  // Get favorite state for the currently selected recipe in modal
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

  // Use shared recipe filters hook
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    recipeFilterSections,
    hasFilters,
    activeFilterCount,
    clearFilters,
    filterRecipes
  } = useRecipeFilters();

  // Memoized filtered recipes - derived from initialRecipes + filter function
  const filteredRecipes = useMemo(() => {
    return filterRecipes(initialRecipes || []);
  }, [initialRecipes, filterRecipes]);

  const showEmptyState = hasFilters && filteredRecipes.length === 0;

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

          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
            </div>
          )}

          {!showEmptyState && (
            <div className="mt-6">
              <RecipeList
                recipes={filteredRecipes}
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
  try {
    const initialRecipes = await fetchRecipesForServer(24);
    return { props: { initialRecipes } };
  } catch (err) {
    return { props: { initialRecipes: [] } };
  }
}