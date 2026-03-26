'use client';

import { useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';
import HomeFiltersBar from '@/components/home/HomeFiltersBar';
import HomeModalController from '@/components/home/HomeModalController';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import Toast, { useToast } from '@/components/ui/Toast';

export default function Home({ initialRecipes = [] }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { toast, showToast } = useToast();

  // Filters
  const { 
    searchQuery, setSearchQuery, sortBy, setSortBy, 
    showFilters, setShowFilters, recipeFilterSections, hasFilters, 
    activeFilterCount, clearFilters, filterRecipes 
  } = useRecipeFilters();

  // Memoized recipes list
  const recipesList = useMemo(() => {
    return filterRecipes(initialRecipes || []);
  }, [initialRecipes, filterRecipes]);

  // Recipe click - just set selected, detail fetch is in HomeModalController
  const handleRecipeClick = useCallback((recipe) => {
    setSelectedRecipe({ ...recipe });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const showEmptyState = hasFilters && recipesList.length === 0;

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

      <HomeHero onPrimaryAction={() => {}} weeklyPlan={[]} shoppingList={[]} onRefreshPlan={() => {}} />

      <section id="recipes" className="pt-8 pb-24 bg-[#F8F3E8]">
        <div className="max-w-[1200px] mx-auto px-4">
          <HomeFiltersBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            activeFilterCount={activeFilterCount}
            clearFilters={clearFilters}
          />

          {showFilters && (
            <div className="mb-6">
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
          )}

          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件，或者清除所有篩選</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
            </div>
          )}

          {recipesList.length > 0 && (
            <HomeRecipeGrid
              recipes={recipesList}
              onRecipeClick={handleRecipeClick}
            />
          )}
        </div>
      </section>

      <HomeModalController
        selectedRecipe={selectedRecipe}
        onClose={handleCloseModal}
      />

      {toast && <Toast toast={toast} />}
    </Layout>
  );
}