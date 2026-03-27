'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';
import HomeFiltersBar from '@/components/home/HomeFiltersBar';
import HomeModalController from '@/components/home/HomeModalController';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import Toast, { useToast } from '@/components/ui/Toast';
import { fetchRecipesForServer } from '@/lib/recipesServer';

const DAYS = ['週一', '週二', '週三', '週四', '週五'];

export default function Home({ initialRecipes = [] }) {
  const router = useRouter();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { toast, showToast } = useToast();

  // Weekly plan state - separate from selectedRecipe
  const [weeklyPlan, setWeeklyPlan] = useState([]);

  // Filters
  const { 
    searchQuery, setSearchQuery, sortBy, setSortBy, 
    showFilters, setShowFilters, recipeFilterSections, hasFilters, 
    activeFilterCount, clearFilters, filterRecipes 
  } = useRecipeFilters();

  // Memoized recipes list
  const recipesList = useMemo(() => {
    return filterRecipes(initialRecipes || []);
  }, [initialRecipes, filterRecipes]);

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
      
      // Check if recipe has ingredients
      if (recipe && recipe.ingredients) {
        try {
          const ingredients = typeof recipe.ingredients === 'string' 
            ? JSON.parse(recipe.ingredients) 
            : recipe.ingredients;
            
          if (Array.isArray(ingredients)) {
            for (const ing of ingredients) {
              const name = ing.name || ing.item || '未知食材';
              const qtyRaw = ing.qty || ing.amount || ing.quantity || ing.qty_per_person || '1';
              
              // Try to parse as number for summation
              const qtyNum = parseFloat(qtyRaw);
              
              if (ingredientMap.has(name)) {
                const existing = ingredientMap.get(name);
                if (typeof existing === 'number' && !isNaN(qtyNum)) {
                  // Sum numeric quantities
                  ingredientMap.set(name, existing + qtyNum);
                } else {
                  // Append as string fallback
                  ingredientMap.set(name, `${existing}+${qtyRaw}`);
                }
              } else {
                // Store as number if possible
                ingredientMap.set(name, !isNaN(qtyNum) ? qtyNum : qtyRaw);
              }
            }
          }
        } catch (e) {
          // Skip invalid ingredients
        }
      }
    }
    
    // Convert to array with string qty
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
    if (!recipesList || recipesList.length === 0) {
      setWeeklyPlan([]);
    } else {
      setWeeklyPlan(buildWeeklyPlan(recipesList));
    }
  }, [recipesList, buildWeeklyPlan]);

  // Recipe click - just set selected, detail fetch is in HomeModalController
  const handleRecipeClick = useCallback((recipe) => {
    setSelectedRecipe({ ...recipe });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  // Navigate to /generate
  const handlePrimaryAction = useCallback(() => {
    router.push('/generate');
  }, [router]);

  // Regenerate weekly plan - does NOT touch selectedRecipe
  const handleRefreshPlan = useCallback(() => {
    setWeeklyPlan(buildWeeklyPlan(recipesList));
  }, [recipesList, buildWeeklyPlan]);

  const showEmptyState = hasFilters && recipesList.length === 0;

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

          {showFilters && (
            <div className="mb-6">
              <RecipeFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortBy={sortBy}
                setSortBy={setSortBy}
                recipeFilterSections={recipeFilterSections || []}
                hasFilters={hasFilters}
                activeFilterCount={activeFilterCount}
                clearFilters={clearFilters}
              />
            </div>
          )}

          {showEmptyState && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件，或者清除所有篩選</p>
              <button onClick={clearFilters} className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95">清除篩選</button>
            </div>
          )}

          {recipesList.length > 0 && (
            <HomeRecipeGrid
              recipes={recipesList}
              onRecipeClick={handleRecipeClick}
            />
          )}
        </div>
      </section>

      <HomeModalController
        selectedRecipe={selectedRecipe}
        onClose={handleCloseModal}
      />

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