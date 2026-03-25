'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';
import HomeFiltersBar from '@/components/home/HomeFiltersBar';
import HomeModalController from '@/components/home/HomeModalController';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import Toast, { useToast } from '@/components/ui/Toast';

// Homepage doesn't use favorites hook - avoids slow initial fetch
// Favorites only work on /recipes and /favorites pages

// Fetch recipe detail with cache
const recipeDetailCache = new Map();
const fetchRecipeDetail = async (recipeId) => {
  if (recipeDetailCache.has(recipeId)) {
    return recipeDetailCache.get(recipeId);
  }
  const res = await fetch(`/api/recipes/${recipeId}`);
  const data = await res.json();
  const recipes = data?.data?.recipes || data?.recipes || [];
  recipeDetailCache.set(recipeId, recipes[0] || null);
  return recipes[0] || null;
};

export default function Home({ initialRecipes = [], ssrError = null }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const abortControllerRef = useRef(null);
  const { toast, showToast } = useToast();

  // Performance instrumentation
  useEffect(() => {
    console.log('[Perf] Home mount');
  }, []);

// NO favorites fetch on homepage - use separate hooks for other pages
  // Homepage doesn't load favorites to avoid blocking
  
  // Filters
  const { filters, searchQuery, setSearchQuery, sortBy, setSortBy, showFilters, setShowFilters, recipeFilterSections, hasFilters, activeFilterCount, clearFilters, filterRecipes } = useRecipeFilters();

  // Memoized recipes list - proper pattern
  const recipesList = useMemo(() => {
    return filterRecipes(initialRecipes || []);
  }, [initialRecipes, filterRecipes]);

  // Recipe click - progressive loading
  const handleRecipeClick = useCallback((recipe) => {
    // Abort previous
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Set selected immediately with card data
    setSelectedRecipe({ ...recipe });
    setModalLoading(true);

    // Fetch full detail in background
    fetchRecipeDetail(recipe.id)
      .then(fullRecipe => {
        if (fullRecipe) {
          setSelectedRecipe(prev => prev ? { ...prev, ...fullRecipe } : fullRecipe);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch recipe:', err);
        }
      })
      .finally(() => {
        setModalLoading(false);
      });
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSelectedRecipe(null);
  }, []);

  const hasSearch = searchQuery?.trim()?.length > 0;
  const showEmptyState = hasFilters && recipesList.length === 0;

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

      <HomeHero onPrimaryAction={() => {}} weeklyPlan={[]} shoppingList={[]} onRefreshPlan={() => {}} />

      {/* Recipe Section */}
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

          {/* Filters */}
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

          {/* Empty State */}
          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件，或者清除所有篩選</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
            </div>
          )}

          {/* Recipe Grid */}
          {recipesList.length > 0 && (
            <HomeRecipeGrid
              recipes={recipesList}
              favoriteSet={new Set()}
              toggleFavorite={async () => false}
              isAuthenticated={false}
              onAuthRequired={() => {
                showToast('請先登入以收藏食譜', 'info');
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
              }}
              onRecipeClick={handleRecipeClick}
            />
          )}
        </div>
      </section>

      {/* Detail Modal */}
      <HomeModalController
        selectedRecipe={selectedRecipe}
        modalLoading={modalLoading}
        favoriteSet={new Set()}
        toggleFavorite={async () => false}
        isAuthenticated={false}
        onAuthRequired={() => {
          showToast('請先登入以收藏食譜', 'info');
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }}
        onClose={handleCloseModal}
      />

      {/* Toast */}
      {toast && <Toast toast={toast} />}
    </Layout>
  );
}
export async function getServerSideProps() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { props: { initialRecipes: [], ssrError: 'Missing env vars' } };
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,cook_time_minutes,prep_time_minutes,calories_per_serving,protein_g,primary_protein,dish_type,diet,is_public,created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(24);
    
    if (error) {
      return { props: { initialRecipes: [], ssrError: error.message } };
    }

    return { props: { initialRecipes: recipes || [], ssrError: null } };
  } catch (e) {
    return { props: { initialRecipes: [], ssrError: e.message } };
  }
}
