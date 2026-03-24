'use client';
import { useState, useEffect, useRef } from 'react';
import { useFavorites } from '@/hooks/useFavorites';

import { Toast, useToast } from '@/components/ui/Toast';
import Head from 'next/head';
import { Layout } from '@/components';
import HomeHero from '@/components/home/HomeHero';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import RecipeFilters from '@/components/recipes/RecipeFilters';

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
  
  
  if (!weeklyPlan || weeklyPlan.length === 0) {

    return [];
  }
  
  const recipeIds = weeklyPlan.map(item => item.recipe?.id).filter(Boolean);

  if (recipeIds.length === 0) {

    return [];
  }

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

    return list;
  } catch (e) {

    return [];
  }
}

export default function Home({ initialRecipes = [], ssrError = null }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // In-memory cache for recipe details - useRef to avoid rerenders
  const recipeDetailCache = useRef(new Map());
  // Track pending requests to deduplicate in-flight fetches
  const pendingRequests = useRef(new Map());
  
  // Helper to fetch recipe detail with deduplication and abort support
  // NOTE: If hover prefetch started without signal and click later calls with signal,
  // the existing pending promise is returned, so click abort won't control that request.
  // This edge case is acceptable - worst case is one redundant request.
  const fetchRecipeDetail = (recipeId, signal) => {
    // Return cached data if resolved
    const cached = recipeDetailCache.current.get(recipeId);
    if (cached) return Promise.resolve(cached);
    
    // Return existing pending promise if fetching
    const pending = pendingRequests.current.get(recipeId);
    if (pending) return pending;
    
    // Start new fetch
    const fetchPromise = fetch(`/api/recipes/${recipeId}`, { signal })
      .then(res => res.json())
      .then(data => {
        recipeDetailCache.current.set(recipeId, data);
        pendingRequests.current.delete(recipeId);
        return data;
      })
      .catch(err => {
        pendingRequests.current.delete(recipeId);
        // Ignore AbortError - it's expected when cancelling
        if (err.name === 'AbortError') return Promise.reject(err);
        throw err;
      });
    
    pendingRequests.current.set(recipeId, fetchPromise);
    return fetchPromise;
  };
  
  // Abort controller for current fetch
  const abortControllerRef = useRef(null);
  
  // Favorites hook
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();
  const { toast, showToast } = useToast();
  
  // Weekly plan state (homepage specific) - initialize as empty, generate in useEffect
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [planLoaded, setPlanLoaded] = useState(false);
  
  // Generate weekly plan after mount to avoid hydration mismatch from Math.random()
  useEffect(() => {
    if (initialRecipes && initialRecipes.length > 0 && !planLoaded) {
      setWeeklyPlan(generateWeeklyPlan(initialRecipes));
      setPlanLoaded(true);
    }
  }, [initialRecipes, planLoaded]);
  
  // Auto-prefetch first 2 visible recipes after mount (delayed to not block initial render)
  useEffect(() => {
    if (initialRecipes.length > 0) {
      // Delay prefetch to not block initial page render
      const timerId = setTimeout(() => {
        const firstTwo = initialRecipes.slice(0, 2);
        firstTwo.forEach(recipe => {
          handleRecipeHover(recipe);
        });
      }, 1500); // Wait 1.5s after mount
      return () => clearTimeout(timerId);
    }
  }, [initialRecipes]);
  
  // AUTO SHOPPING LIST DISABLED
  // useEffect(() => {
  //   async function fetchShoppingList() {
  //     if (weeklyPlan.length === 0) {
  //       setShoppingList([]);
  //       return;
  //     }
  //     const list = await generateShoppingListFromPlan(weeklyPlan);
  //       setShoppingList(list);
  //   }
  //   fetchShoppingList();
  // }, [weeklyPlan]);
  
  // Use shared recipe filters hook (no args)
  const {
    filters,
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
    filterRecipes,
  } = useRecipeFilters();

  // Filter recipes using the hook
  const allRecipes = initialRecipes || [];
  const filteredRecipes = filterRecipes(allRecipes);
  const recipesList = filteredRecipes;

  // Recipe click handler - progressive loading with cache and race protection
  const activeRecipeIdRef = useRef(null);
  
  const handleRecipeClick = (recipe) => {

    const startTime = performance.now();

    // Abort previous fetch if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Race protection: mark active recipe
    activeRecipeIdRef.current = recipe.id;
    
    // Immediately show modal with card data (instant)

    setSelectedRecipe(recipe);
    setModalLoading(true);
    
    // Check cache first (useRef)
    const cached = recipeDetailCache.current.get(recipe.id);
    if (cached) {
      
      // Support both { recipes: [...] } and legacy flat object
      const fullRecipe = cached.recipes?.[0] || cached;
      setSelectedRecipe(prev => prev ? { ...prev, ...fullRecipe } : fullRecipe);
      setModalLoading(false);
      
      // Measure paint time
      requestAnimationFrame(() => {
        
      });
      return;
    }
    
    // Fetch full detail in background with abort support
    const fetchStart = performance.now();
    fetchRecipeDetail(recipe.id, abortControllerRef.current.signal)
      .then(data => {
        // Race protection: ignore stale responses
        if (activeRecipeIdRef.current !== recipe.id) {

          return;
        }
        
        const fetchTime = performance.now() - fetchStart;
        
        
        // Merge full detail into existing recipe
        // Support both { recipes: [...] } and legacy flat object
        const fullRecipe = data.recipes?.[0] || data;
        setSelectedRecipe(prev => prev ? { ...prev, ...fullRecipe } : fullRecipe);
        
        // State merge complete
        const mergeTime = performance.now();

        setModalLoading(false);
        
        // Measure paint time after React renders
        requestAnimationFrame(() => {
          
        });
      })
      .catch(err => {
        // Ignore AbortError - already handled
        if (err.name === 'AbortError') {

          return;
        }

        setModalLoading(false);
      });
  };

  // Prefetch recipe detail on hover/touch - uses shared fetch helper with deduplication
  const handleRecipeHover = (recipe) => {
    // Skip if already cached or pending (fetchRecipeDetail handles deduplication)
    fetchRecipeDetail(recipe.id).catch(() => {});
  };

  const hasSearch = searchQuery?.trim()?.length > 0;
  
  // Show empty state only if filters applied and no results
  const showEmptyState = hasFilters && recipesList.length === 0;
  
  // No skeleton - use simple loading state
  const showSkeleton = false;

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
                const newPlan = generateWeeklyPlan(recipesList.length > 0 ? recipesList : initialRecipes);
                setWeeklyPlan(newPlan);
              }}
            />

      {/* Recipe Section - Homepage Style */}
      <section id="recipes" className="pt-8 pb-24 bg-[#F8F3E8]">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* 1. Centered Heading */}
          <div className="text-center mb-6">
            <h2 className="text-[1.5rem] md:text-[2.25rem] font-black text-[#3A2010]">食譜</h2>
          </div>

          {/* Shared Filter Component */}
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
                <div 
                  key={recipe.id} 
                  className="col-span-12 sm:col-span-6 md:col-span-4"
                  
                >
                  <RecipeCard
                    recipe={recipe}
                    onClick={() => handleRecipeClick(recipe)}
                    onFavorite={async () => {
                      if (!isAuthenticated) {
                        showToast('請先登入以收藏食譜', 'info');
                        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                        return;
                      }
                      
                      const result = await toggleFavorite(recipe.id);
                      
                      if (!result) {
                        showToast('收藏失敗，請再試一次', 'error');
                      }
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
        onClose={() => {
          // Abort any in-flight fetch when modal closes
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
          setSelectedRecipe(null);
        }}
        recipe={selectedRecipe}
        loading={modalLoading}
        isFavorite={selectedRecipe ? isFavorite(selectedRecipe.id) : false}
        onFavorite={async () => {
          if (!isAuthenticated) {
            showToast('請先登入以收藏食譜', 'info');
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
          }
          if (selectedRecipe?.id) {
            
            const result = await toggleFavorite(selectedRecipe.id);
            
            if (!result) {
              showToast('收藏失敗，請再試一次', 'error');
            }
          }
        }}
      />
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

    // Use simpler query first to debug
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
