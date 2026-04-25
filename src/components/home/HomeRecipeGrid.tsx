import React from 'react';
import RecipeCard from '@/components/RecipeCard';

interface HomeRecipeGridProps {
  recipes: any[];
  onRecipeClick?: (recipe: any) => void;
  isFavorite?: (recipeId: string | number) => boolean;
  isPending?: (recipeId: string | number) => boolean;
  onFavoriteClick?: (recipeId: string | number) => void | Promise<void>;
}

/**
 * RecipeGridItem - memoized individual card wrapper
 * Isolates inline callback creation to prevent grid re-renders
 * 
 * If onRecipeClick is provided → pass to RecipeCard as onClick
 * If onRecipeClick is undefined → RecipeCard renders <Link> for client-side navigation
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

// Memoize to prevent re-renders when parent props unchanged
const MemoizedGridItem = React.memo(RecipeGridItem, (prev, next) => {
  if (prev.recipe?.id !== next.recipe?.id) return false;
  if (prev.isFavorite !== next.isFavorite) return false;
  if (prev.isPending !== next.isPending) return false;
  return true;
});

/**
 * HomeRecipeGrid - recipe grid for homepage with favorites support
 * - Uses memoized item component to isolate callback creation
 * - Pass onRecipeClick to RecipeCard only if provided (enables Link navigation when undefined)
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
          isFavorite={typeof isFavorite === 'function' ? isFavorite(recipe.id) : undefined}
          isPending={typeof isPending === 'function' ? isPending(recipe.id) : undefined}
          onFavoriteClick={typeof onFavoriteClick === "function" ? () => onFavoriteClick(recipe.id) : undefined}
        />
      ))}
    </div>
  );
}

export default React.memo(HomeRecipeGrid);