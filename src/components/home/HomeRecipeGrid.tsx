import React from 'react';
import RecipeCard from '@/components/RecipeCard';

interface HomeRecipeGridProps {
  recipes: any[];
  favoriteSet: Set<string>;
  toggleFavorite: (recipeId: string | number) => Promise<boolean>;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onRecipeClick: (recipe: any) => void;
}

/**
 * HomeRecipeGrid - isolated recipe grid for homepage
 * - Memoized to prevent re-renders from parent state changes
 * - Only re-renders when recipes, favoriteSet, or handlers change
 */
function HomeRecipeGrid({ 
  recipes, 
  favoriteSet, 
  toggleFavorite, 
  isAuthenticated, 
  onAuthRequired, 
  onRecipeClick 
}: HomeRecipeGridProps) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {recipes.map(recipe => (
        <div 
          key={recipe.id} 
          className="col-span-12 sm:col-span-6 md:col-span-4"
        >
          <RecipeCard
            recipe={recipe}
            onClick={() => onRecipeClick(recipe)}
            toggleFavorite={toggleFavorite}
            isFavorite={favoriteSet.has(String(recipe.id))}
            isAuthenticated={isAuthenticated}
            onAuthRequired={onAuthRequired}
          />
        </div>
      ))}
    </div>
  );
}

export default React.memo(HomeRecipeGrid);