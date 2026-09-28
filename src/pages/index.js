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
import HomeRecipesSection from '@/components/home/HomeRecipesSection';
import HomeRecipeFilterControls from '@/features/home/components/HomeRecipeFilterControls';
import AppliedFiltersSummary from '@/features/home/components/AppliedFiltersSummary';
import { fetchRecipesForServerWithTotal, fetchHomeRecipeCatalog } from '@/lib/recipesServer';

export default function Home({ initialRecipes = [], initialTotalCount = 0, catalog = null }) {
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
    hasDraftSelection,
    appliedFilterCount,
    appliedFilterChips,
    appliedSearchQuery,
    removeDraftFilterValue,
    removeDraftSearch,
    clearFilters,
    clearAppliedFilters,
    applyFilters,
    hasPendingChanges,
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
    catalog,
  });

  const { weeklyPlan, handleRefreshPlan, isFavorite, handleFavoriteToggle, shoppingList, shoppingLoading, shoppingError, refreshShoppingList } = useHomePageController({
    planRecipes: initialRecipes,
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
        <HomeHero
          onPrimaryAction={handlePrimaryAction}
          weeklyPlan={weeklyPlan}
          shoppingList={shoppingList}
          shoppingLoading={shoppingLoading}
          shoppingError={shoppingError}
          onRefreshPlan={handleRefreshPlan}
          onRefreshShoppingList={refreshShoppingList}
        />
        <HomeHowItWorks />
        <HomeAboutSection />
        <div className="max-w-[1200px] mx-auto px-4">
          <HomeRecipeFilterControls
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            recipeFilterSections={recipeFilterSections}
            hasDraftSelection={hasDraftSelection}
            hasPendingChanges={hasPendingChanges}
            appliedFilterCount={appliedFilterCount}
            clearFilters={clearFilters}
            applyFilters={applyFilters}
          />
          {(showResults || showEmptyState) && (
            <AppliedFiltersSummary
              chips={appliedFilterChips}
              appliedSearchQuery={appliedSearchQuery}
              resultCountText={resultCountText}
              onRemoveChip={removeDraftFilterValue}
              onRemoveSearch={removeDraftSearch}
              onResetAll={clearAppliedFilters}
            />
          )}
          {showResults && (
            <HomeRecipesSection
              recipes={recipesList}
              isFavorite={isFavorite}
              onFavoriteClick={handleFavoriteToggle}
              loadMore={loadMore}
              hasMore={hasMore}
              loadingMore={loadingMore}
            />
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
            <p className="text-[#AA7A50]">沒有找到食譜</p>
          </div>
        )}
      </main>
      {toast && <Toast {...toast} />}
    </Layout>
  );
}

export async function getStaticProps() {
  const catalog = await fetchHomeRecipeCatalog();
  const { recipes: initialRecipes, total: totalCount, error } = catalog
    ? { recipes: catalog.slice(0, 24), total: catalog.length }
    : await fetchRecipesForServerWithTotal(24);
  if (error) {
    console.error('error loading homepage recipes:', error);
  }
  return {
    props: {
      initialRecipes: initialRecipes || [],
      initialTotalCount: totalCount || 0,
      catalog,
    },
    revalidate: 300,
  };
}
