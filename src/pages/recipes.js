'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeCard from '@/components/RecipeCard';
import RecipeModalController from '@/components/RecipeModalController';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useToast } from '@/components/ui/Toast';

export default function RecipesPage({ initialRecipes }) {
  // Use centralized auth guard - includes getAccessToken
  const { user, isAuthenticated, getAccessToken, requireAuth } = useAuthGuard();
  const { favorites, isFavorite, toggleFavorite, loadFavorites } = useFavorites();
  const { toast, showToast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  
  // Load favorites when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      getAccessToken().then(token => {
        if (token) loadFavorites(token, user.id);
      });
    }
  }, [isAuthenticated, user]);
  
  // Handle favorite click - use requireAuth
  const handleFavorite = useCallback((recipeId) => {
    if (!requireAuth()) {
      showToast('請先登入以收藏食譜', 'info');
      return;
    }
    getAccessToken().then(token => {
      if (token) toggleFavorite(recipeId, token);
    });
  }, [requireAuth, getAccessToken, toggleFavorite, showToast]);
  
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleRecipeClick(recipe)}
                  onFavorite={() => handleFavorite(recipe.id)}
                  isFavorite={isFavorite(recipe.id)}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
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
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/recipes?limit=24`);
    let initialRecipes = [];
    
    if (res.ok) {
      const data = await res.json();
      initialRecipes = data?.data?.recipes || data?.recipes || [];
    }
    
    return { props: { initialRecipes } };
  } catch (err) {
    return { props: { initialRecipes: [] } };
  }
}