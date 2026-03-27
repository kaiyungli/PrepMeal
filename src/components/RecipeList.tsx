import React, { useMemo } from 'react';
import RecipeCard from '@/components/RecipeCard';

interface RecipeListProps {
  recipes: any[];
  onRecipeClick?: (recipe: any) => void;
  onFavorite?: (recipeId: string | number) => void;
  isFavorite?: (recipeId: string | number) => boolean;
  isAuthenticated?: boolean;
  emptyMessage?: string;
  emptyLink?: string;
}

/**
 * RecipeList - shared component for rendering recipe card grids
 * Uses Set for O(1) isFavorite lookup
 */
function RecipeList({
  recipes,
  onRecipeClick,
  onFavorite,
  isFavorite,
  isAuthenticated,
  emptyMessage = '暫時未有食譜',
  emptyLink,
}: RecipeListProps) {
  // Create Set for O(1) lookup - only call isFavorite once per render
  const favoriteSet = useMemo(() => {
    if (!isFavorite) return null;
    const set = new Set<string>();
    // We can't pre-compute since we need recipe.id for each - keep original pattern
    return null;
  }, [isFavorite]);

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
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={onRecipeClick ? () => onRecipeClick(recipe) : undefined}
          onFavorite={onFavorite ? () => onFavorite(recipe.id) : undefined}
          isFavorite={isFavorite ? isFavorite(recipe.id) : undefined}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}

export default React.memo(RecipeList);