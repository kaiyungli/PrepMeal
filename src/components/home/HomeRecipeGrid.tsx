import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import RecipeCard from '@/components/RecipeCard';

interface HomeRecipeGridProps {
  recipes: any[];
  onRecipeClick?: (recipe: any) => void;
  isFavorite?: (recipeId: string | number) => boolean;
  isPending?: (recipeId: string | number) => boolean;
  onFavoriteClick?: (recipeId: string | number) => void | Promise<void>;
  loadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

/**
 * RecipeGridItem - memoized individual card wrapper
 */
function RecipeGridItem({ 
  recipe, 
  onRecipeClick,
  isFavorite,
  isPending,
  onFavoriteClick 
}: { 
  recipe: any;
  onRecipeClick?: (recipe: any) => void;
  isFavorite?: boolean;
  isPending?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
}) {
  return (
    <div className="col-span-12 sm:col-span-6 md:col-span-4">
      <RecipeCard
        recipe={recipe}
        onClick={onRecipeClick ? () => onRecipeClick(recipe) : undefined}
        isFavorite={isFavorite}
        favoriteLoading={isPending}
        onFavoriteClick={onFavoriteClick}
      />
    </div>
  );
}

const MemoizedGridItem = React.memo(RecipeGridItem, (prev, next) => {
  if (prev.recipe?.id !== next.recipe?.id) return false;
  if (prev.isFavorite !== next.isFavorite) return false;
  if (prev.isPending !== next.isPending) return false;
  return true;
});

/**
 * HomeRecipeGrid - recipe grid with infinite scroll
 */
function HomeRecipeGrid({ 
  recipes, 
  onRecipeClick,
  isFavorite,
  isPending,
  onFavoriteClick,
  loadMore,
  hasMore,
  loadingMore,
}: HomeRecipeGridProps) {
  const router = useRouter();
  const prefetchedRef = useRef(new Set());
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  
  // Safe recipes list for rendering
  const safeRecipes = (recipes || []);
  
  // First 6 recipes for prefetch
  const prefetchRecipes = safeRecipes.slice(0, 6);
  const prefetchKey = prefetchRecipes.map(r => r.id).join(',');
  
  // Prefetch first 6 recipe detail pages
  useEffect(() => {
    if (!prefetchRecipes.length) return;
    
    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = 0;
    
    for (const recipe of prefetchRecipes) {
      if (prefetchedRef.current.has(recipe.id)) continue;
      prefetchedRef.current.add(recipe.id);
      const path = `/recipes/${recipe.slug || recipe.id}`;
      
      const timer = setTimeout(() => {
        router.prefetch(path);
      }, delay);
      timers.push(timer);
      delay += 300;
    }
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [prefetchKey, router]);
  
  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loadingMore || !loadMoreRef.current) return;
      
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Load more when 200px from bottom
      if (scrollY + windowHeight >= documentHeight - 200) {
        loadMoreRef.current();
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore]);
  
  return (
    <>
      <div className="grid grid-cols-12 gap-4">
        {safeRecipes.map(recipe => (
          <MemoizedGridItem
            key={recipe.id}
            recipe={recipe}
            onRecipeClick={onRecipeClick}
            isFavorite={typeof isFavorite === 'function' ? isFavorite(recipe.id) : undefined}
            isPending={typeof isPending === 'function' ? isPending(recipe.id) : undefined}
            onFavoriteClick={typeof onFavoriteClick === "function" ? () => onFavoriteClick(recipe.id) : undefined}
          />
        ))}
      </div>
      
      {/* Loading indicator */}
      {loadingMore && (
        <div className="text-center py-4 text-[#AA7A50]">
          載入更多...
        </div>
      )}
    </>
  );
}

export default React.memo(HomeRecipeGrid);