import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

export default function RecipesPage({ initialRecipes }) {
  const { user, isAuthenticated, getAccessToken } = useAuth();
  const { favorites, isFavorite, toggleFavorite, loading: favLoading, loadFavorites } = useFavorites();
  const { toast, showToast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Load favorites once when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !favorites.length) {
      getAccessToken().then(token => {
        if (token) loadFavorites(token);
      });
    }
  }, [isAuthenticated]);
  
  // Handle favorite click - pass token explicitly
  const handleFavorite = async (recipeId) => {
    if (!isAuthenticated) {
      showToast('請先登入以收藏食譜', 'info');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const token = await getAccessToken();
    await toggleFavorite(recipeId, token);
  };
  
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

  // Filter and sort recipes client-side
  const allRecipes = initialRecipes || [];
  const filteredRecipes = filterRecipes(allRecipes);
  
  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return 0;
      case 'calories_low':
        return (a.calories_per_serving || 0) - (b.calories_per_serving || 0);
      case 'calories_high':
        return (b.calories_per_serving || 0) - (a.calories_per_serving || 0);
      case 'protein_high':
        return (b.protein_g || 0) - (a.protein_g || 0);
      case 'time_short':
        return (a.total_time_minutes || 999) - (b.total_time_minutes || 0);
      case 'newest':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  return (
    <Layout>
      <Head>
        <title>食譜 | PrepMeal</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Heading */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#3D3D3D]">食譜</h1>
        </div>

        {/* Reusable Filters */}
        
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

        {/* Recipe Grid */}
        {sortedRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => setSelectedRecipe(recipe)}
                onFavorite={() => handleFavorite(recipe.id)}
                isFavorite={isFavorite(recipe.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[#7A746B] mb-4">沒有找到符合的食譜</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[#9B6035] font-medium hover:underline"
              >
                清除全部篩選
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          loading={modalLoading}
        />
      )}
    </Layout>
  );
}

// Server-side rendering
export async function getServerSideProps() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return { props: { initialRecipes: [] } };
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100);
    
    return {
      props: {
        initialRecipes: recipes || [],
      },
    };
  } catch (e) {
    return {
      props: {
        initialRecipes: [],
      },
    };
  }
}
