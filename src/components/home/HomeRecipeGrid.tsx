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
 * RecipeGridItem - memoized individual card wrapper
 * Isolates inline callback creation to prevent grid re-renders
 */
function RecipeGridItem({ 
  recipe, 
  onRecipeClick,
  isFavorite,
  isPending,
  onFavoriteClick 
}: { 
  recipe: any;
  onRecipeClick: (recipe: any) => void;
  isFavorite?: boolean;
  isPending?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
}) {
  return (
    <div className="col-span-12 sm:col-span-6 md:col-span-4">
      <RecipeCard
        recipe={recipe}
        onClick={() => onRecipeClick(recipe)}
        isFavorite={isFavorite}
        favoriteLoading={isPending}
        onFavoriteClick={onFavoriteClick}
      />
    </div>
  );
}

// Memoize to prevent re-renders when parent props unchanged
const MemoizedGridItem = React.memo(RecipeGridItem, (prev, next) => {
  return prev.recipe?.id === next.recipe?.id &&
    prev.onRecipeClick === next.onRecipeClick &&
    prev.isFavorite === next.isFavorite &&
    prev.isPending === next.isPending &&
    prev.onFavoriteClick === next.onFavoriteClick;
});

/**
 * HomeRecipeGrid - recipe grid for homepage with favorites support
 * - Uses memoized item component to isolate callback creation
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
        <MemoizedGridItem
          key={recipe.id}
          recipe={recipe}
          onRecipeClick={onRecipeClick}
          isFavorite={isFavorite ? isFavorite(recipe.id) : undefined}
          isPending={isPending ? isPending(recipe.id) : undefined}
          onFavoriteClick={onFavoriteClick ? () => onFavoriteClick(recipe.id) : undefined}
        />
      ))}
    </div>
  );
}

export default React.memo(HomeRecipeGrid);