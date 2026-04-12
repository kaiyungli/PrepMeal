'use client';

import { useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipesSection from '@/components/home/HomeRecipesSection';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useHomePageController } from '@/features/home';
import Toast, { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServer } from '@/lib/recipesServer';

export default function Home({ initialRecipes = [] }) {
  const router = useRouter();
  const { toast, showToast } = useToast();

  // Filters (temporarily kept in page)
  const { 
    searchQuery, setSearchQuery, sortBy, setSortBy, 
    showFilters, setShowFilters, recipeFilterSections, hasFilters, 
    activeFilterCount, clearFilters, filterRecipes 
  } = useRecipeFilters();

  // Memoized recipes list
  const recipesList = useMemo(() => {
    return filterRecipes(initialRecipes || []);
  }, [initialRecipes, filterRecipes]);

  // Controller
  const { weeklyPlan, handleRefreshPlan, isFavorite, handleFavoriteToggle, shoppingList, shoppingLoading, shoppingError } = useHomePageController({ recipesList, showToast });

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
        shoppingList={shoppingList}
        shoppingLoading={shoppingLoading}
        shoppingError={shoppingError}
        onRefreshPlan={handleRefreshPlan}
      />

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
        {toast && <Toast toast={toast} />}

        <div className="mt-8">
          <HomeFiltersBar
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          activeFilterCount={activeFilterCount}
        />

        {showFilters && (
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
            clearFilters={clearFilters}
          />
        )}

        {showEmptyState ? (
          <div className="text-center py-20">
            <p className="text-[var(--color-text-muted)]">未找到相符既食譜</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-[var(--color-primary)]">
                清除篩選
              </button>
            )}
          </div>
        ) : (
          <HomeRecipesSection
            recipes={recipesList}
            isFavorite={isFavorite}
            onFavoriteClick={handleFavoriteToggle}
            onRecipeClick={(r) => router.push(`/recipes/${r.id}`)}
          />
        )}
      </div>
    </div>
  </Layout>
  );
}

export async function getServerSideProps() {
  const recipes = await fetchRecipesForServer();
  return { props: { initialRecipes: recipes || [] } };
}