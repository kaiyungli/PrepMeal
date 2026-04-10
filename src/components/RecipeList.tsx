import React from 'react';
import RecipeCard from '@/components/RecipeCard';

interface RecipeListProps {
  recipes: any[];
  onRecipeClick?: (recipe: any) => void;
  isFavorite?: (recipeId: string | number) => boolean;
  isPending?: (recipeId: string | number) => boolean;
  onFavoriteClick?: (recipeId: string | number) => void | Promise<void>;
  isAuthenticated?: boolean;
  emptyMessage?: string;
  emptyLink?: string;
}

/**
 * RecipeList - shared component for rendering recipe card grids
 * Prepares per-recipe favorite props before passing to cards
 */
function RecipeList({
  recipes,
  onRecipeClick,
  isFavorite,
  isPending,
  onFavoriteClick,
  isAuthenticated,
  emptyMessage = '暫時未有食譜',
  emptyLink,
}: RecipeListProps) {
  // Dev diagnostics - only runs in development
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    console.log("[RecipeList] isFavorite type:", typeof isFavorite);
    console.log("[RecipeList] isPending type:", typeof isPending);
    console.log("[RecipeList] onFavoriteClick type:", typeof onFavoriteClick);
  }
  
  if (!recipes || recipes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#7A746B] mb-4">{emptyMessage}</p>
        {emptyLink && (
          <a href={emptyLink} className="text-[#9B6035] font-medium hover:underline">
            去搵啱你嘅食譜 →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {(recipes || []).map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={onRecipeClick ? () => onRecipeClick(recipe) : undefined}
          isFavorite={typeof isFavorite === 'function' ? isFavorite(recipe.id) : undefined}
          favoriteLoading={typeof isPending === 'function' ? isPending(recipe.id) : undefined}
          onFavoriteClick={typeof onFavoriteClick === 'function' ? () => onFavoriteClick(recipe.id) : undefined}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}

export default React.memo(RecipeList);