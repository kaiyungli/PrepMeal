import { useState } from 'react';
import Head from 'next/head';
import { Layout } from '@/components';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/components/ui/Toast';

export default function RecipesPage({ initialRecipes }) {
  const { isFavorite, toggleFavorite, isAuthenticated, loading: favLoading } = useFavorites();
  const { toast, showToast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
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

  // Sort recipes client-side
  const sortedRecipes = [...(recipes || [])].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return 0; // No popularity data yet
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#3D3D3D] mb-2">食譜</h1>
          <p className="text-[#7A746B]">瀏覽全部食譜，或用條件快速篩選</p>
        </div>

        {/* Reusable Filters */}
        
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

        {/* Results Count */}
        <div className="mb-4 text-sm text-[#7A746B]">
          {loading ? (
            <span>載入中...</span>
          ) : (
            <span>找到 {sortedRecipes.length} 個食譜</span>
          )}
        </div>

        {/* Recipe Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[#9B6035]">載入中...</div>
          </div>
        ) : sortedRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => setSelectedRecipe(recipe)}
                onFavorite={() => {
                  if (!isAuthenticated) {
                    showToast('請先登入以收藏食譜', 'info');
                      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                  }
                  toggleFavorite(recipe.id);
                }}
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
