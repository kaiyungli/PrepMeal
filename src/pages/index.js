'use client';

import { useEffect } from 'react';

import { useState, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFavorites } from '@/hooks/useFavorites';
import Toast, { useToast } from '@/components/ui/Toast';

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

  // Favorites
  const { favorites, toggleFavorite, isAuthenticated } = useFavorites();
  const favoriteSet = useMemo(() => new Set(favorites.map(String)), [favorites]);

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
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B6035]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜尋食譜..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-[#E8DCC8] bg-[#FFFDF8] text-[#3A2010] placeholder-[#C0A080] focus:outline-none focus:border-[#9B6035]"
              />
            </div>
          </div>

          {/* Filter Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#E8DCC8] bg-white text-[#3A2010] hover:border-[#9B6035]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              篩選 {activeFilterCount > 0 && <span className="bg-[#9B6035] text-white px-2 py-0.5 rounded-full text-xs">{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && <button onClick={clearFilters} className="text-[#9B6035] text-sm">清除全部</button>}
          </div>

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
                recipeFilterSections={recipeFilterSections}
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
              favoriteSet={favoriteSet}
              toggleFavorite={toggleFavorite}
              isAuthenticated={isAuthenticated}
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
      <RecipeDetailModal
        isOpen={!!selectedRecipe}
        onClose={handleCloseModal}
        recipe={selectedRecipe}
        loading={modalLoading}
        isFavorite={selectedRecipe ? favoriteSet.has(String(selectedRecipe.id)) : false}
        toggleFavorite={toggleFavorite}
        isAuthenticated={isAuthenticated}
        onAuthRequired={() => {
          showToast('請先登入以收藏食譜', 'info');
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }}
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
