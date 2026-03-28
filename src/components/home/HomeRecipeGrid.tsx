import React from 'react';
import RecipeCard from '@/components/RecipeCard';

interface HomeRecipeGridProps {
  recipes: any[];
  onRecipeClick: (recipe: any) => void;
  isFavorite?: (recipeId: string | number) => boolean;
  isPending?: (recipeId: string | number) => boolean;
  onFavoriteClick?: (recipeId: string | number) => void | Promise<void>;
}

/**
 * HomeRecipeGrid - recipe grid for homepage with favorites support
 * - Memoized to prevent re-renders from parent state changes
 */
function HomeRecipeGrid({ 
  recipes, 
  onRecipeClick,
  isFavorite,
  isPending,
  onFavoriteClick,
}: HomeRecipeGridProps) {
  const safeRecipes = recipes || [];
  return (
    <div className="grid grid-cols-12 gap-4">
      {safeRecipes.map(recipe => (
        <div 
          key={recipe.id} 
          className="col-span-12 sm:col-span-6 md:col-span-4"
        >
          <RecipeCard
            recipe={recipe}
            onClick={() => onRecipeClick(recipe)}
            isFavorite={isFavorite ? isFavorite(recipe.id) : undefined}
            favoriteLoading={isPending ? isPending(recipe.id) : undefined}
            onFavoriteClick={onFavoriteClick ? () => onFavoriteClick(recipe.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

export default React.memo(HomeRecipeGrid);