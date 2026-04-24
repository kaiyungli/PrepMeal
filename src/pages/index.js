'use client';

import { useCallback, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipesSection from '@/components/home/HomeRecipesSection';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFilteredRecipes } from '@/features/recipes/hooks/useFilteredRecipes';
import { useHomePageController } from '@/features/home';
import Toast, { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServer } from '@/lib/recipesServer';
import { perfNow, perfLog, measurePageLoadMetrics } from '@/utils/perf';

export default function Home({ initialRecipes = [] }) {
  // Homepage first-load start timestamp - created at initial render
  const firstLoadStartRef = useRef(perfNow());
  const homeDataReadyLogged = useRef(false);
  const router = useRouter();
  const { toast, showToast } = useToast();

  // Filters (temporarily kept in page)
  const { 
    searchQuery, setSearchQuery, sortBy, setSortBy, 
    showFilters, setShowFilters, recipeFilterSections, hasFilters, 
    activeFilterCount, clearFilters, filters 
  } = useRecipeFilters();

  // API-driven filtered recipes (shared hook)
  const { recipes: recipesList, totalCount, loading, fetchError } = useFilteredRecipes(
    initialRecipes || [],
    { filters: filters, searchQuery, sortBy, limit: 24 }
  );

  // Controller
  const { weeklyPlan, handleRefreshPlan, isFavorite, handleFavoriteToggle, shoppingList, shoppingLoading, shoppingError, refreshShoppingList } = useHomePageController({ recipesList, showToast });

  // Log homepage first-load ready metric
  useEffect(() => {
    const start = firstLoadStartRef.current;
    const end = perfNow();
    perfLog({
      event: 'page_load',
      stage: 'home_ready',
      label: 'home.first_load.ready',
      start,
      end,
    });

    // Measure real browser page load metrics (TTFB, FCP, LCP, DCL, load)
    return measurePageLoadMetrics();
  }, []);

  // Log homepage data-ready metric when recipes data is available (only once)
  useEffect(() => {
    if (!recipesList || recipesList.length === 0) return;
    if (homeDataReadyLogged.current) return;

    homeDataReadyLogged.current = true;
    perfLog({
      event: 'page_load',
      stage: 'home_data_ready',
      label: 'home.first_load.data_ready',
      start: firstLoadStartRef.current,
      end: perfNow(),
    });
  }, [recipesList]);

  // Navigate to /generate
  const handlePrimaryAction = useCallback(() => {
    router.push('/generate');
  }, [router]);

  const hasSearchOrFilters = hasFilters || Boolean(searchQuery?.trim());
  const showErrorState = !loading && fetchError;
  const showEmptyState = !loading && !fetchError && recipesList.length === 0;
  const showResults = !loading && !fetchError && recipesList.length > 0;
    const resultCountText = totalCount > 0 ? `共 ${totalCount} 個食譜` : '';

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
              onRecipeClick={(r) => router.push(`/recipes/${r.id}`)}
            />
          </>
        )}
      </div>
  </Layout>
  );
}

export async function getStaticProps() {
  const _start = Date.now();
  console.log('[home-isr] getStaticProps_start');
  const recipes = await fetchRecipesForServer();
  const totalMs = Date.now() - _start;
  console.log('[home-isr] getStaticProps_done', { duration_ms: totalMs, count: recipes?.length || 0 });
  return {
    props: { initialRecipes: recipes || [] },
    revalidate: 300
  };
}