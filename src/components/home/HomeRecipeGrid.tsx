import React from 'react';
import RecipeCard from '@/components/RecipeCard';

interface HomeRecipeGridProps {
  recipes: any[];
  onRecipeClick: (recipe: any) => void;
}

/**
 * HomeRecipeGrid - display-only recipe grid for homepage
 * - Homepage is display-first, no favorites orchestration
 * - Only requires recipes and onRecipeClick
 * - Memoized to prevent re-renders from parent state changes
 */
function HomeRecipeGrid({ 
  recipes, 
  onRecipeClick 
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
          />
        </div>
      ))}
    </div>
  );
}

export default React.memo(HomeRecipeGrid);