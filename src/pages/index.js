'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeFiltersBar from '@/components/home/HomeFiltersBar';
import HomeRecipesSection from '@/components/home/HomeRecipesSection';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useHomePageController } from '@/features/home';
import Toast, { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServer } from '@/lib/recipesServer';




export default function Home({ initialRecipes = [] }) {
  const router = useRouter();
  const { toast, showToast } = useToast();

  // Weekly plan state - separate from selectedRecipe
  

  

  





  // Shopping list preview - reuse API flow
  

  // Filters - stay in index.js
  const { 
    searchQuery, setSearchQuery, sortBy, setSortBy, 
    showFilters, setShowFilters, recipeFilterSections, hasFilters, 
    activeFilterCount, clearFilters, filterRecipes 
  } = useRecipeFilters();

  // Memoized recipes list - MUST be declared before useEffect/callbacks that use it
  const recipesList = useMemo(() => {
    return filterRecipes(initialRecipes || []);
  }, [initialRecipes, filterRecipes]);

  // Weekly plan controller
  const { weeklyPlan, handleRefreshPlan, isFavorite, handleFavoriteToggle, shoppingList, shoppingLoading, shoppingError } = useHomePageController({ recipesList });

  

  // Navigate to /generate
  const handlePrimaryAction = useCallback(() => {
    router.push('/generate');
  }, [router]);

  

  const hasSearchOrFilters = hasFilters || Boolean(searchQuery?.trim());
  const showEmptyState = recipesList.length === 0;

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

      <HomeHero 
        onPrimaryAction={handlePrimaryAction} 
        weeklyPlan={weeklyPlan} 
        shoppingList={shoppingList} shoppingLoading={shoppingLoading} shoppingError={shoppingError} 
        onRefreshPlan={handleRefreshPlan}
      />

      {/* Filters stay in index.js - above grid */}
      <div className="bg-[#F8F3E8]">
        <div className="max-w-[1200px] mx-auto px-4 pt-8">
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
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                recipeFilterSections={recipeFilterSections || []}
                hasFilters={hasFilters}
                activeFilterCount={activeFilterCount}
                clearFilters={clearFilters}
              />
            </div>
          )}

          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">{hasSearchOrFilters ? '😕' : '🍽️'}</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">
                {hasSearchOrFilters ? '暫時冇符合條件嘅食譜' : '暫時未有食譜'}
              </h3>
              <p className="text-sm text-[#C0A080] mb-6">
                {hasSearchOrFilters 
                  ? '試下調整篩選條件，或者清除所有篩選' 
                  : '請稍後再嚟，或者尝试刷新页面'}
              </p>
              {hasSearchOrFilters && (
                <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid + modal in separate section */}
      {!showEmptyState && (
        <HomeRecipesSection
          recipes={recipesList}
          isFavorite={isFavorite}
          isPending={isPending}
          onFavoriteClick={handleFavoriteToggle}
        />
      )}

      {toast && <Toast toast={toast} />}
    </Layout>
  );
}

export async function getServerSideProps() {
  try {
    console.log('[SSR] getServerSideProps: calling fetchRecipesForServer...');
    const recipes = await fetchRecipesForServer(24);
    console.log('[SSR] getServerSideProps: got', recipes?.length || 0, 'recipes');
    
    return { props: { initialRecipes: recipes || [] } };
  } catch (err) {
    console.error('[SSR] getServerSideProps: FATAL error:', err.message, err.stack);
    // NEVER throw - always return valid page
    return { props: { initialRecipes: [] } };
  }
}