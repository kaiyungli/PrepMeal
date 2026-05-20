import React from 'react';
import Head from 'next/head';
import { useEffect } from 'react';

// Controllers
import { useHomePageController } from '@/features/home';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useToast, Toast } from '@/components/ui/Toast';

// Constants
import { HEADER_CONFIG } from '@/constants/header';
import { FOOTER_CONFIG } from '@/constants/footer';

// Hooks (NEW - home page extracted)
import { useHomePageViewState } from '@/features/home/hooks/useHomePageViewState';
import { useHomeRecipeFilters } from '@/features/home/hooks/useHomeRecipeFilters';
import { useHomePerfLogging } from '@/features/home/hooks/useHomePerfLogging';
import { useHomePageActions } from '@/features/home/hooks/useHomePageActions';

// Components
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';

// API
import { getRecipes } from '@/features/recipes';

export default function HomePage({ initialRecipes = [], initialTotalCount = 0 }) {
  // Auth guard
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  // Filter controls and data via hook
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
    initialRecipes,
    initialTotalCount,
  });

  // Show toast on errors
  const { showToast, toast } = useToast();

  // Controller for plan and shopping
  const { handleRefreshPlan, handleFavoriteToggle, refreshShoppingList } = useHomePageController({
    recipesList,
    showToast,
  });

  // Controller for plan loading
  const { weeklyPlan, isFavorite, loading: planLoading, error: planError } = useHomePageController({
    recipesList,
    showToast,
  });

  // Controller for shopping
  const { shoppingList, shoppingLoading, shoppingError } = useHomePageController({
    recipesList,
    showToast,
  });

  // Derived view state via hook
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

  // Performance logging hook
  useHomePerfLogging();

  // Navigation actions hook
  const { handlePrimaryAction } = useHomePageActions();

  // Handler for generate button
  const handleGenerate = () => {
    // Can add tracking here if needed
    window.location.href = '/generate';
  };

  return (
    <>
      <Head>
        <title>Prep Meal - 智能每週餐單</title>
        <meta name="description" content="AI智能 Recipe Planner - 簡化每週餐單" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#F8F3E8]">
        <Header {...HEADER_CONFIG} />

        <main className="flex-1">
          <HomeHero
            isAuthenticated={isAuthenticated}
            onPrimaryAction={handlePrimaryAction}
          />

          {!authLoading && (
            <HomeRecipeGrid
              {...{
                recipesList,
                totalCount,
                loading,
                fetchError,
                loadMore,
                hasMore,
                loadingMore,
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
                hasSearchOrFilters: hasFilters || Boolean(searchQuery?.trim()),
                showErrorState,
                showEmptyState,
                showResults,
                resultCountText,
                loadingMore,
              }}
            />
          )}
        </main>

        <Footer {...FOOTER_CONFIG} />

        {toast && <Toast {...toast} />}
      </div>
    </>
  );
}

export async function getStaticProps() {
  const { recipes: initialRecipes, totalCount, error } = await getRecipes({
    limit: 24,
    filters: {},
  });
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
