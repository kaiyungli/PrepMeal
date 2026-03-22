'use client';
import { useState, useEffect } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import Head from 'next/head';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import RecipeFilters from '@/components/recipes/RecipeFilters';

console.log('[CLIENT] Module loaded');

const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'popular', label: '最受歡迎' },
  { value: 'quick', label: '最快完成' },
  { value: 'high_protein', label: '高蛋白' },
];

// Helper to generate weekly plan from recipes
function generateWeeklyPlan(recipes) {
  if (!recipes || recipes.length === 0) return [];
  
  // Shuffle and pick 5 unique recipes
  const shuffled = [...recipes].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 5);
  const days = ['週一', '週二', '週三', '週四', '週五'];
  
  return selected.map((recipe, index) => ({
    day: days[index],
    recipe: recipe,
    done: index < 2 // First 2 days marked as done for demo
  }));
}

// Helper to generate shopping list from weekly plan using the real API
async function generateShoppingListFromPlan(weeklyPlan) {
  console.log('[ShoppingList] Input weeklyPlan:', JSON.stringify(weeklyPlan));
  
  if (!weeklyPlan || weeklyPlan.length === 0) {
    console.log('[ShoppingList] Empty weeklyPlan, returning []');
    return [];
  }
  
  const recipeIds = weeklyPlan.map(item => item.recipe?.id).filter(Boolean);
  console.log('[ShoppingList] Extracted recipeIds:', recipeIds);
  
  if (recipeIds.length === 0) {
    console.log('[ShoppingList] No recipeIds found, returning []');
    return [];
  }
  
  console.log('[ShoppingList] Generating for recipe IDs:', recipeIds);
  
  try {
    // Use the real shopping list API
    const response = await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeIds,
        pantryIngredients: [],
        servings: 1
      })
    });
    
    const data = await response.json();
    console.log('[ShoppingList] API response status:', response.status);
    console.log('[ShoppingList] API response:', JSON.stringify(data).substring(0, 500));
    
    // Use the toBuy items from the real API
    // Format quantity with unit properly
    const formatQty = (item) => {
      const qty = item.quantity;
      const unit = item.unit || item.unit_name || item.unit_code || '';
      if (!qty) return '';
      return unit ? `${qty}${unit}` : `${qty}`;
    };
    
    const list = (data.toBuy || data.items || []).slice(0, 5).map(item => ({
      name: item.display_name || item.name || item.ingredient_name || '食材',
      qty: formatQty(item)
    }));
    
    console.log('[ShoppingList] Final list:', list);
    return list;
  } catch (e) {
    console.error('[ShoppingList] Error:', e);
    return [];
  }
}

export default function Home({ initialRecipes = [], ssrError = null }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Favorites hook
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();
  
  // Weekly plan state (homepage specific)
  const [weeklyPlan, setWeeklyPlan] = useState(() => generateWeeklyPlan(initialRecipes));
  const [shoppingList, setShoppingList] = useState([]);
  
  // Fetch shopping list when weeklyPlan changes
  useEffect(() => {
    async function fetchShoppingList() {
      if (weeklyPlan.length === 0) {
        setShoppingList([]);
        return;
      }
      const list = await generateShoppingListFromPlan(weeklyPlan);
      setShoppingList(list);
    }
    fetchShoppingList();
  }, [weeklyPlan]);
  
  // Use shared recipe filters hook
  const {
    recipes,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showAdvanced,
    setShowAdvanced,
    recipeFilterSections,
    hasFilters,
    activeFilterCount,
    clearFilters,
  } = useRecipeFilters(initialRecipes);

  // Toggle function for multi-select (keep for other uses)

  // Filter sections for SharedFilterPanel
  // Use recipeFilterSections from hook
  // Ensure recipes is always an array
  const recipesList = recipes || [];

  // Recipe click handler



  const handleRecipeClick = (recipe) => {
    setModalLoading(true);
    fetch(`/api/recipes/${recipe.id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedRecipe(data);
        setModalLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setModalLoading(false);
      });
  };


  const hasSearch = searchQuery?.trim()?.length > 0;
  
  // Show empty state only if filters applied and no results
  const showEmptyState = !loading && hasFilters && recipesList.length === 0;
  
  // Show skeleton when loading with no data
  const showSkeleton = loading;

  // Determine recipe count text
  const recipeCountText = loading ? '載入中...' : 
    (recipesList.length > 0 ? `${recipesList.length} 個食譜` : 
    (hasFilters ? '無符合條件既食譜' : '載入緊...'));

  return (
    <Layout>
      <Head>
        <title>今晚食乜 🥘 - 智能食譜搜尋及餐單生成</title>
        <meta name="description" content="搜尋食譜、生成一週餐單、自動購物清單" />
      </Head>

            <HomeHero 
              onPrimaryAction={() => {}} 
              weeklyPlan={weeklyPlan}
              shoppingList={shoppingList}
              onRefreshPlan={() => {
                const newPlan = generateWeeklyPlan(recipes.length > 0 ? recipes : initialRecipes);
                setWeeklyPlan(newPlan);
              }}
            />

      {/* Recipe Section - Homepage Style */}
      <section id="recipes" className="pt-8 pb-24 bg-[#F8F3E8]">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* 1. Centered Heading */}
          <div className="text-center mb-8">
            <div className="text-xs font-extrabold text-[#F0A060] uppercase tracking-widest mb-3">⭐ 食譜庫</div>
            <h2 className="text-[1.5rem] md:text-[2.25rem] font-black text-[#3A2010] mb-2">食譜</h2>
            <p className="text-sm font-semibold text-[#C0A080]">{recipeCountText}</p>
          </div>

          {/* Shared Filter Component */}
          <RecipeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            recipeFilterSections={recipeFilterSections}
            hasFilters={hasFilters}
            activeFilterCount={activeFilterCount}
            clearFilters={clearFilters}
          />

          {/* 5. Recipe Cards Grid */}
          {showSkeleton && (
            <div className="grid grid-cols-12 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="col-span-12 sm:col-span-6 md:col-span-4 animate-pulse">
                  <div className="bg-[#F8F3E8] rounded-2xl border-2 border-[#DDD0B0] overflow-hidden">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showSkeleton && recipesList.length > 0 && (
            <div className="grid grid-cols-12 gap-6">
              {recipesList.map(recipe => (
                <div key={recipe.id} className="col-span-12 sm:col-span-6 md:col-span-4">
                  <RecipeCard
                    recipe={recipe}
                    onClick={() => handleRecipeClick(recipe)}
                    onFavorite={() => {
                      if (!isAuthenticated) {
                        alert('請先登入以收藏食譜');
                      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                        return;
                      }
                      toggleFavorite(recipe.id);
                    }}
                    isFavorite={isFavorite(recipe.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {!showSkeleton && recipesList.length === 0 && hasFilters && (
            <div className="text-center py-16">
              <div className="text-6xl mb-2">😕</div>
              <h3 className="text-xl font-bold text-[#3A2010] mb-2">暫時冇符合條件嘅食譜</h3>
              <p className="text-sm text-[#C0A080] mb-6">試下調整篩選條件，或者清除所有篩選</p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 rounded-full bg-[#9B6035] text-white font-medium hover:opacity-95"
              >
                清除篩選
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Filter Modal */}
      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        recipe={selectedRecipe}
        loading={modalLoading}
      />
    </Layout>
  );
}

export async function getServerSideProps() {
  console.log('[SSR] ====== START ======');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[SSR] 1. Env check:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[SSR] 2. Missing env vars - returning empty');
      return { props: { initialRecipes: [], ssrError: 'Missing env vars' } };
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('[SSR] 3. Client created, executing query...');
    
    // Use simpler query first to debug
    const { data: recipes, error, count } = await supabase
      .from('recipes')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100);
    
    console.log('[SSR] 4. Query executed:', { 
      error: error?.message, 
      count: count,
      recipesLength: recipes?.length,
      errorDetails: JSON.stringify(error)
    });
    
    if (error) {
      console.error('[SSR] 5. Supabase error:', error.message, error.details, error.hint);
      return { props: { initialRecipes: [], ssrError: error.message } };
    }
    
    console.log('[SSR] 6. Success, returning', recipes?.length || 0, 'recipes');
    console.log('[SSR] ====== END ======');
    return { props: { initialRecipes: recipes || [], ssrError: null } };
  } catch (e) {
    console.error('[SSR] 7. Fatal error:', e.message, e.stack);
    return { props: { initialRecipes: [], ssrError: e.message } };
  }
}
