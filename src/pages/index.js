'use client';

import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { useHomePageActions } from '@/features/home/hooks/useHomePageActions';
import { useHomeRecipeFilters } from '@/features/home/hooks/useHomeRecipeFilters';
import { useHomePerfLogging } from '@/features/home/hooks/useHomePerfLogging';
import { useHomePageViewState } from '@/features/home/hooks/useHomePageViewState';
import { useHomePageController } from '@/features/home';
import Toast, { useToast } from '@/components/ui/Toast';
import HomeHero from '@/components/home/HomeHero';
import HomeHowItWorks from '@/components/home/HomeHowItWorks';
import HomeAboutSection from '@/components/home/HomeAboutSection';
import HomeFeaturedRecipes from '@/components/home/HomeFeaturedRecipes';
import HomeRecipesSection from '@/components/home/HomeRecipesSection';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { fetchRecipesForServerWithTotal } from '@/lib/recipesServer';

export default function Home({ initialRecipes = [], initialTotalCount = 0 }) {
  const { toast, showToast } = useToast();

  const { markDataReady } = useHomePerfLogging();
  const { handlePrimaryAction } = useHomePageActions();

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

  const { weeklyPlan, handleRefreshPlan, isFavorite, handleFavoriteToggle, shoppingList, shoppingLoading, shoppingError, refreshShoppingList } = useHomePageController({
    recipesList,
    showToast,
  });

  useEffect(() => {
    if (!recipesList || recipesList.length === 0) return;
    markDataReady();
  }, [recipesList, markDataReady]);

  const {
    showErrorState,
    showEmptyState,
    showResults,
    resultCountText,
  } = useHomePageViewState({
    loading,
    fetchError,
    recipesList,
    totalCount,
    hasFilters,
    searchQuery,
  });

  return (
    <Layout>
      <SEO
        title="今晚食乜"
        description="AI智能食譜搜尋及每週餐單生成。一click生成一週餐單，簡化每日晚飯選擇。"
        ogType="website"
      />
      <main className="flex-1">
        <HomeHero onPrimaryAction={handlePrimaryAction} />
        <HomeHowItWorks />
        <HomeAboutSection />
        <HomeFeaturedRecipes recipes={recipesList} />
        <div className="max-w-[1200px] mx-auto px-4">
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
          />
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

        {loading && (
          <div className="text-center py-12 text-[#AA7A50]">載入中...</div>
        )}

        {showErrorState && (
          <div className="text-center py-12 text-red-600">
            載入失敗，請重試
          </div>
        )}

        {showEmptyState && (
          <div className="text-center py-12">
            <p className="text-[#AA7A50] mb-4">沒有找到食譜</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[#9B6035] underline"
              >
                清除篩選
              </button>
            )}
          </div>
        )}
      </main>
      {toast && <Toast {...toast} />}
    </Layout>
  );
}

export async function getStaticProps() {
  const { recipes: initialRecipes, totalCount, error } = await fetchRecipesForServerWithTotal(24);
  if (error) {
    console.error('error loading homepage recipes:', error);
  }
  return {
    props: {
      initialRecipes: initialRecipes || [],
      initialTotalCount: totalCount || 0,
    },
    revalidate: 300,
  };
}