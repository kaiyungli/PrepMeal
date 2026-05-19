'use client';

import { useRef, useEffect } from 'react';
import Head from 'next/head';
import { useHomePageActions } from '@/features/home/hooks/useHomePageActions';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipesSection from '@/components/home/HomeRecipesSection';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useHomeRecipeFilters } from '@/features/home/hooks/useHomeRecipeFilters';
import { useHomePerfLogging } from '@/features/home/hooks/useHomePerfLogging';

import { useHomePageViewState } from '@/features/home/hooks/useHomePageViewState';
import { useHomePageController } from '@/features/home';
import Toast, { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServerWithTotal } from '@/lib/recipesServer';

export default function Home({ initialRecipes = [], initialTotalCount = 0 }) {

  const { toast, showToast } = useToast();

  // Performance logging

  // Navigation actions via hook
  const { handlePrimaryAction } = useHomePageActions();

  // Filters (temporarily kept in page)
  // Recipe filtering via hook
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
    recipesList,
    totalCount,
    loading,
    fetchError,
    loadMore,
    hasMore,
    loadingMore,
  } = useHomeRecipeFilters({
    initialRecipes: initialRecipes || [],
    initialTotalCount,
  });

  // Controller
  const { weeklyPlan, handleRefreshPlan, isFavorite, handleFavoriteToggle, shoppingList, shoppingLoading, shoppingError, refreshShoppingList } = useHomePageController({ recipesList, showToast });

  // Performance logging via hook

  // Navigation actions via hook

  // Derived view state via hook
  const {
    hasSearchOrFilters,
    showErrorState,
    showEmptyState,
    showResults,
    resultCountText,
  } = useHomePageViewState({
    loading: loading,
    fetchError: fetchError,
    recipesList: recipesList,
    totalCount: totalCount,
    hasFilters: hasFilters,
    searchQuery: searchQuery,
  });

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

      <HomeHero
        onPrimaryAction={handlePrimaryAction}
        weeklyPlan={weeklyPlan}
        shoppingList={shoppingList}
        shoppingLoading={shoppingLoading}
        shoppingError={shoppingError}
        onRefreshPlan={handleRefreshPlan}
        onRefreshShoppingList={refreshShoppingList}
        shoppingListInitialized={false}
      />

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
        {toast && <Toast toast={toast} />}

        <div className="mt-8">
          <RecipeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            recipeFilterSections={recipeFilterSections}
            activeFilterCount={activeFilterCount}
            clearFilters={clearFilters}
          />
        </div>

        {loading && (
          <div className="text-center py-20">
            <p className="text-[var(--color-text-muted)]">載入中...</p>
          </div>
        )}

        {showErrorState && (
          <div className="text-center py-20">
            <p className="text-red-500">{fetchError}</p>
          </div>
        )}

        {showEmptyState && (
          <div className="text-center py-20">
            <p className="text-[var(--color-text-muted)]">未找到相符既食譜</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-[var(--color-primary)]">
                清除篩選
              </button>
            )}
          </div>
        )}

        {showResults && (
          <>
            {resultCountText && (
              <div className="text-sm text-[#7A5A38] mb-2">
                {resultCountText}
              </div>
            )}
            <HomeRecipesSection
              recipes={recipesList}
              isFavorite={isFavorite}
              onFavoriteClick={handleFavoriteToggle}
              loadMore={loadMore}
              hasMore={hasMore}
              loadingMore={loadingMore}
            />
          </>
        )}
      </div>
  </Layout>
  );
}

export async function getStaticProps() {
  const { recipes, total } = await fetchRecipesForServerWithTotal(24);
  return {
    props: {
      initialRecipes: recipes || [],
      initialTotalCount: total || 0
    },
    revalidate: 300
  };
}