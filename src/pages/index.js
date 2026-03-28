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
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import Toast, { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServer } from '@/lib/recipesServer';

const DAYS = ['週一', '週二', '週三', '週四', '週五'];

export default function Home({ initialRecipes = [] }) {
  const router = useRouter();
  const { toast, showToast } = useToast();

  // Weekly plan state - separate from selectedRecipe
  const [weeklyPlan, setWeeklyPlan] = useState([]);

  // Auth for favorites - stays in index.js
  const { isAuthenticated, getAccessToken, loading: authLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        getAccessToken().then(t => setToken(t));
      } else {
        setToken(null);
      }
    }
  }, [authLoading, isAuthenticated, getAccessToken]);

  // useFavorites stays in index.js
  const { isFavorite, isPending, toggleFavorite } = token ? useFavorites(token) : { 
    favorites: [], 
    isFavorite: () => false, 
    isPending: () => false, 
    toggleFavorite: () => Promise.resolve(false) 
  };

  // Favorite toggle handler with auth check
  const handleFavoriteToggle = useCallback((recipeId) => {
    if (!isAuthenticated) {
      showToast('請先登入以收藏食譜', 'info');
      return;
    }
    toggleFavorite(recipeId);
  }, [isAuthenticated, toggleFavorite, showToast]);

  // Build weekly plan from recipes - preserve ingredients for shopping list
  const buildWeeklyPlan = useCallback((recipes) => {
    if (!recipes || recipes.length === 0) return [];
    
    const shuffled = [...recipes].sort(() => 0.5 - Math.random());
    const planRecipes = shuffled.slice(0, 5);
    
    return planRecipes.map((recipe, index) => ({
      day: DAYS[index] || `DAY${index + 1}`,
      recipe: {
        id: recipe.id,
        name: recipe.name,
        image_url: recipe.image_url,
        ingredients: recipe.ingredients || null,
      }
    }));
  }, []);

  // Build shopping list from weekly plan - aggregates real ingredients
  const buildShoppingList = useCallback((plan) => {
    if (!plan || plan.length === 0) return [];
    
    const ingredientMap = new Map();
    
    for (const item of plan) {
      const recipe = item.recipe;
      
      if (recipe && recipe.ingredients) {
        try {
          const ingredients = typeof recipe.ingredients === 'string' 
            ? JSON.parse(recipe.ingredients) 
            : recipe.ingredients;
            
          if (Array.isArray(ingredients)) {
            for (const ing of ingredients) {
              const name = ing.name || ing.item || '未知食材';
              const qtyRaw = ing.qty || ing.amount || ing.quantity || ing.qty_per_person || '1';
              const qtyNum = parseFloat(qtyRaw);
              
              if (ingredientMap.has(name)) {
                const existing = ingredientMap.get(name);
                if (typeof existing === 'number' && !isNaN(qtyNum)) {
                  ingredientMap.set(name, existing + qtyNum);
                } else {
                  ingredientMap.set(name, `${existing}+${qtyRaw}`);
                }
              } else {
                ingredientMap.set(name, !isNaN(qtyNum) ? qtyNum : qtyRaw);
              }
            }
          }
        } catch (e) {
          // Skip invalid ingredients
        }
      }
    }
    
    return Array.from(ingredientMap.entries()).map(([name, qty]) => ({
      name,
      qty: typeof qty === 'number' ? String(qty) : qty
    }));
  }, []);

  // Shopping list from weekly plan
  const shoppingList = useMemo(() => {
    return buildShoppingList(weeklyPlan);
  }, [weeklyPlan, buildShoppingList]);

  // Regenerate weekly plan when recipesList changes
  useEffect(() => {
    if (!initialRecipes || initialRecipes.length === 0) {
      setWeeklyPlan([]);
    } else {
      setWeeklyPlan(buildWeeklyPlan(initialRecipes));
    }
  }, [initialRecipes, buildWeeklyPlan]);

  // Filters - stay in index.js
  const { 
    searchQuery, setSearchQuery, sortBy, setSortBy, 
    showFilters, setShowFilters, recipeFilterSections, hasFilters, 
    activeFilterCount, clearFilters, filterRecipes 
  } = useRecipeFilters();

  // Memoized recipes list
  const recipesList = useMemo(() => {
    return filterRecipes(initialRecipes || []);
  }, [initialRecipes, filterRecipes]);

  // Navigate to /generate
  const handlePrimaryAction = useCallback(() => {
    router.push('/generate');
  }, [router]);

  // Regenerate weekly plan
  const handleRefreshPlan = useCallback(() => {
    setWeeklyPlan(buildWeeklyPlan(initialRecipes));
  }, [initialRecipes, buildWeeklyPlan]);

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
    const initialRecipes = await fetchRecipesForServer(24);
    return { props: { initialRecipes } };
  } catch (err) {
    return { props: { initialRecipes: [] } };
  }
}