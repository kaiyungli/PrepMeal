'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeList from '@/components/RecipeList';
import RecipeModalController from '@/components/RecipeModalController';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServer } from '@/lib/recipesServer';

export default function RecipesPage({ initialRecipes }) {
  // Use centralized auth guard - includes getAccessToken
  const { user, isAuthenticated, getAccessToken, requireAuth } = useAuthGuard();
  
  // Get token for SWR
  const [token, setToken] = useState(null);
  
  useEffect(() => {
    getAccessToken().then(t => setToken(t));
  }, [getAccessToken]);
  
  const { favorites, isFavorite, toggleFavorite } = useFavorites(token);
  const { toast, showToast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  
  // Favorites load automatically via SWR when token is available
  
  // Handle favorite click - use requireAuth
  const handleFavorite = useCallback((recipeId) => {
    if (!requireAuth()) {
      showToast('請先登入以收藏食譜', 'info');
      return Promise.resolve(false);
    }
    return toggleFavorite(recipeId);
  }, [requireAuth, toggleFavorite, showToast]);
  
  // Recipe click - just set selected, modal controller handles detail fetch
  const handleRecipeClick = useCallback((recipe) => {
    setSelectedRecipe({ ...recipe });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

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
        <div className="max-w-[1200px] mx-auto px-4">
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

          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
            </div>
          )}

          {!showEmptyState && (
            <RecipeList
              recipes={filteredRecipes}
              onRecipeClick={handleRecipeClick}
              onFavorite={handleFavorite}
              isFavorite={isFavorite}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>

      <RecipeModalController
        selectedRecipe={selectedRecipe}
        onClose={handleCloseModal}
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